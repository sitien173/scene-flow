# Postiz publisher for scene-flow renders. Uploads a finished 9:16 MP4 to the author's own Postiz
# instance and creates one post covering the channels listed in postiz.json.
#
# Reads POSTIZ_URL and POSTIZ_API_KEY from the environment only. The key is never printed, logged,
# written to disk, or accepted as an argument. Uses the standard library only (urllib, json) and
# ffprobe for media checks.
#
# usage (from the project root):
#   python scripts/postiz.py channels
#   python scripts/postiz.py <file.mp4> [--dry-run] [--schedule <ISO 8601 with offset> | --now] [--again]
import argparse
import datetime
import hashlib
import http.client
import json
import os
import secrets
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

LOCAL_HOSTS = ("localhost", "127.0.0.1")
TIMEOUT_DEFAULT = 30
TIMEOUT_UPLOAD = 300
# Not set by the plan; chosen here. POST /posts is never retried, so this only bounds the wait.
TIMEOUT_POST = 120
RECEIPT = "postiz-receipt.json"

# Source: Postiz public API, public-api/openapi.json (integration identifier field) and
# public-api/providers/instagram.mdx and tiktok.mdx (__type values), checked 2026-11-18.
# The Instagram integration identifier is unverified: it is assumed to match the settings __type.
PLATFORM_IDENTIFIERS = {
    "tiktok": ("tiktok",),
    "instagram": ("instagram", "instagram-standalone"),
    "youtube": ("youtube",),
}
# Source: Postiz public-api/providers/tiktok.mdx, title max 90 characters, checked 2026-11-18.
TIKTOK_TITLE_LIMIT = 90
# Source: Postiz public-api/providers/youtube.mdx, title 2-100 characters, checked 2026-11-18.
YOUTUBE_TITLE_MIN = 2
# Source: Postiz public-api/providers/youtube.mdx, title upper limit, checked 2026-11-18.
YOUTUBE_TITLE_LIMIT = 100
# Source: Meta IG User Media reference, "Maximum 2200 characters", seen in search results 2026-11-18.
# The TikTok limit (2,200 UTF-16 runes) comes from a secondary source and is unverified.
CAPTION_LIMIT = 2200
# unverified: Meta IG User Media reference states 30 hashtags, but a secondary source reports
# 5 hashtags per Instagram caption from 2025-12-18. The conservative value is used.
INSTAGRAM_HASHTAG_LIMIT = 5
# Source: YouTube Help, Shorts "up to 3 minutes long" (support.google.com/youtube/answer/10059070),
# checked 2026-11-18.
YOUTUBE_SHORTS_MAX_SECONDS = 180
# unverified: Instagram API warning threshold of 60 s, from a Meta developer forum report
# dated 2026-11-06.
INSTAGRAM_WARN_SECONDS = 60
# Source: Postiz public-api/providers/youtube.mdx, type is visibility (public, unlisted, private).
# Shorts need no setting. Decision by the coordinator: public.
YOUTUBE_VISIBILITY = "public"
# Source: Postiz cli/platform-examples.mdx, a single video with post_type "post" is published as a
# Reel. instagram.mdx lists post and story. Checked 2026-11-18.
INSTAGRAM_POST_TYPE = "post"


class PostizError(Exception):
    """Base error for Postiz calls. The message is safe to print."""


class PostizTransientError(PostizError):
    """Connection error, timeout, or 5xx. An upload may be retried once; a post outcome is unknown."""


class PostizHttpError(PostizError):
    """Postiz answered with a 4xx status."""
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def get_config():
    """Read POSTIZ_URL and POSTIZ_API_KEY from the environment. Exit cleanly if missing or unsafe."""
    url = os.environ.get("POSTIZ_URL")
    key = os.environ.get("POSTIZ_API_KEY")
    if not url or not key:
        sys.exit("POSTIZ_URL and POSTIZ_API_KEY must be set in the environment.")
    parsed = urllib.parse.urlparse(url)
    if "@" in parsed.netloc:
        sys.exit("POSTIZ_URL must not contain a username or password.")
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in LOCAL_HOSTS):
        sys.exit("POSTIZ_URL must use https (http is allowed only for localhost and 127.0.0.1).")
    return url.rstrip("/"), key


def load_project_config(path):
    """Read postiz.json from the project root. Exit with one line if it is missing or invalid."""
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        sys.exit(f"{path} not found. Copy postiz.json from the scene-flow template.")
    except json.JSONDecodeError as error:
        sys.exit(f"{path} is not valid JSON: {error}")
    if not isinstance(data, dict):
        sys.exit(f"{path} must contain a JSON object.")
    return data


def resolve_channels(names, integrations):
    """Map each postiz.json channel entry to one enabled integration. First match wins."""
    live = [c for c in integrations if not c.get("disabled")]
    resolved = []
    for name in names:
        by_id = [c for c in live if c.get("id") == name]
        if by_id:
            resolved.append(by_id[0])
            continue
        identifiers = PLATFORM_IDENTIFIERS.get(name, (name,))
        matches = [c for c in live if c.get("identifier") in identifiers]
        if len(matches) == 1:
            resolved.append(matches[0])
        elif matches:
            listing = ", ".join(f"{c['id']} ({c.get('name', '')})" for c in matches)
            sys.exit(f"'{name}' matches {len(matches)} channels: {listing}. Put one integration ID in postiz.json.")
        else:
            sys.exit(f"no channel matches '{name}'. Run `python scripts/postiz.py channels` to list them.")
    return resolved


class RefuseRedirects(urllib.request.HTTPRedirectHandler):
    """Refuse every redirect. urllib would resend the Authorization header to the new origin."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        sys.exit("Postiz redirected the request; set POSTIZ_URL to the final API address.")


# Shared by every Postiz call, so Phase 2 requests inherit the redirect refusal.
POSTIZ_OPENER = urllib.request.build_opener(RefuseRedirects)


def fetch_integrations(url, key):
    """GET /public/v1/integrations. The key travels only in the Authorization header."""
    request = urllib.request.Request(f"{url}/public/v1/integrations", headers={"Authorization": key})
    try:
        with POSTIZ_OPENER.open(request, timeout=TIMEOUT_DEFAULT) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        if error.code == 401:
            sys.exit("Postiz rejected POSTIZ_API_KEY (401 unauthorized). Check that the key is current.")
        sys.exit(f"Postiz returned HTTP {error.code} for GET /public/v1/integrations.")
    except OSError:
        sys.exit(f"Could not reach Postiz at {urllib.parse.urlparse(url).netloc}.")
    except ValueError:
        sys.exit("Postiz returned a response that is not JSON.")
    integrations = data.get("integrations", []) if isinstance(data, dict) else data
    if not isinstance(integrations, list):
        sys.exit("Postiz returned an unexpected response for GET /public/v1/integrations.")
    return integrations


def probe(mp4):
    """One ffprobe call. Returns the parsed JSON, or None when ffprobe cannot read the file."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height:format=duration",
             "-of", "json", mp4],
            capture_output=True, text=True, timeout=60,
        )
    except FileNotFoundError:
        sys.exit("ffprobe is not installed or not on PATH. Install ffmpeg.")
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def parse_schedule(value):
    """Parse an ISO 8601 timestamp. Raises ValueError when the text is not ISO 8601."""
    return datetime.datetime.fromisoformat(value[:-1] + "+00:00" if value.endswith("Z") else value)


def compose_content(caption, hashtags):
    """Caption, a blank line, then the hashtags, each with a leading #."""
    tags = " ".join(tag if tag.startswith("#") else f"#{tag}" for tag in hashtags)
    return "\n\n".join(part for part in (caption, tags) if part)


def sources_mention_ai(path="assets/SOURCES.md"):
    try:
        with open(path, encoding="utf-8") as handle:
            return "ai-generated" in handle.read().lower()
    except FileNotFoundError:
        return False


def preflight(mp4, config, schedule):
    """Run every check before any network call. Returns (blocks, warnings) as lists of messages."""
    blocks, warnings = [], []
    if not os.path.isfile(mp4):
        return [f"{mp4} does not exist."], warnings
    if not mp4.lower().endswith(".mp4"):
        blocks.append(f"{mp4} must be an .mp4 file.")
    if os.path.getsize(mp4) == 0:
        return blocks + [f"{mp4} is empty."], warnings
    info = probe(mp4)
    if info is None:
        return blocks + [f"ffprobe could not read {mp4}."], warnings
    streams = info.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    if video is None:
        blocks.append(f"{mp4} has no video stream.")
    else:
        width, height = video.get("width", 0), video.get("height", 0)
        if width * 16 != height * 9:
            blocks.append(f"{mp4} is {width}x{height}; it must be 9:16.")
        if video.get("codec_name") != "h264":
            blocks.append(f"{mp4} video codec is {video.get('codec_name')}; it must be h264.")
    if not any(s.get("codec_type") == "audio" for s in streams):
        blocks.append(f"{mp4} has no audio stream.")
    duration = float(info.get("format", {}).get("duration", 0))

    ai_generated = config.get("ai_generated")
    if not isinstance(ai_generated, bool):
        blocks.append("ai_generated must be true or false in postiz.json.")
    elif not ai_generated and sources_mention_ai():
        blocks.append("assets/SOURCES.md lists an AI-generated picture; set ai_generated to true.")
    elif ai_generated:
        warnings.append("ai_generated is true: set the AI label on Instagram and YouTube by hand in Postiz.")

    if schedule is not None:
        try:
            when = parse_schedule(schedule)
        except ValueError:
            blocks.append(f"--schedule '{schedule}' is not ISO 8601.")
        else:
            if when.tzinfo is None:
                blocks.append("--schedule needs a timezone offset, for example 2030-01-01T10:00:00+07:00.")
            elif when <= datetime.datetime.now(datetime.timezone.utc):
                blocks.append("--schedule is in the past.")

    if duration > INSTAGRAM_WARN_SECONDS:
        warnings.append(f"{mp4} is {duration:.1f} s, over the {INSTAGRAM_WARN_SECONDS} s Instagram warning threshold.")
    if duration > YOUTUBE_SHORTS_MAX_SECONDS:
        warnings.append(f"{mp4} is {duration:.1f} s, over the {YOUTUBE_SHORTS_MAX_SECONDS} s YouTube Shorts limit.")
    if os.path.isfile("index.html") and os.path.getmtime(mp4) < os.path.getmtime("index.html"):
        warnings.append(f"{mp4} is older than index.html; re-render before posting.")
    return blocks, warnings


def platform_of(channel):
    """Platform name for a resolved channel, or None when postiz.py does not support it."""
    return next((p for p, ids in PLATFORM_IDENTIFIERS.items() if channel["identifier"] in ids), None)


def platform_blocks(channels, config):
    """Checks that depend on the resolved platforms. Run after GET /integrations and before any upload."""
    platforms = {platform_of(channel) for channel in channels}
    blocks = []
    content = compose_content(config.get("caption", ""), config.get("hashtags", []))
    title = config.get("youtube_title", "")
    hashtags = config.get("hashtags", [])
    # CAPTION_LIMIT applies to TikTok and Instagram. The code has no YouTube caption limit.
    if platforms & {"tiktok", "instagram"} and len(content) > CAPTION_LIMIT:
        blocks.append(f"caption is {len(content)} characters with hashtags; the limit is {CAPTION_LIMIT}.")
    if "youtube" in platforms and not YOUTUBE_TITLE_MIN <= len(title) <= YOUTUBE_TITLE_LIMIT:
        blocks.append(
            f"youtube_title must be {YOUTUBE_TITLE_MIN} to {YOUTUBE_TITLE_LIMIT} characters; it has {len(title)}."
        )
    if "instagram" in platforms and len(hashtags) > INSTAGRAM_HASHTAG_LIMIT:
        blocks.append(f"hashtags: {len(hashtags)} given; the Instagram limit is {INSTAGRAM_HASHTAG_LIMIT}.")
    return blocks


def fail_on(blocks):
    """Print each block to stderr and exit 1 when any check failed."""
    if blocks:
        for block in blocks:
            print(f"blocked: {block}", file=sys.stderr)
        sys.exit(1)


# Media for the dry run. A real run passes the {id, path} that POST /public/v1/upload returned.
PLACEHOLDER_MEDIA = [{"id": "<media id after upload>", "path": "<media path after upload>"}]


def build_post(channel, config, media):
    """Planned /posts entry for one channel. media is the list of {id, path} entries to attach."""
    platform = platform_of(channel)
    if platform is None:
        sys.exit(f"channel {channel['id']} is {channel['identifier']}, which postiz.py does not support.")
    caption = config.get("caption", "")
    if platform == "tiktok":
        settings = {
            "__type": "tiktok",
            "title": caption[:TIKTOK_TITLE_LIMIT],
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "duet": False,
            "stitch": False,
            "comment": True,
            "autoAddMusic": "no",
            "brand_content_toggle": False,
            "brand_organic_toggle": False,
            "video_made_with_ai": config["ai_generated"],
            "content_posting_method": "DIRECT_POST",
        }
    elif platform == "youtube":
        settings = {"__type": "youtube", "title": config.get("youtube_title", ""), "type": YOUTUBE_VISIBILITY}
    else:
        settings = {"__type": channel["identifier"], "post_type": INSTAGRAM_POST_TYPE}
    content = compose_content(caption, config.get("hashtags", []))
    return {"integration": {"id": channel["id"]}, "value": [{"content": content, "image": media}], "settings": settings}


def body_message(error):
    """The message field of a Postiz JSON error body, or an empty string. Headers are never read."""
    try:
        data = json.loads(error.read().decode("utf-8"))
    except (OSError, ValueError):
        return ""
    message = data.get("message") if isinstance(data, dict) else None
    if isinstance(message, list):
        message = "; ".join(str(item) for item in message)
    return message if isinstance(message, str) else ""


def http_error(error):
    """Map a Postiz HTTP error to a typed exception. Messages never include the key or request headers."""
    status = error.code
    if status >= 500:
        return PostizTransientError(f"Postiz returned HTTP {status}.")
    if status == 401:
        return PostizHttpError(
            status, "Postiz rejected POSTIZ_API_KEY (401 unauthorized). Check that the key is current.")
    if status == 413:
        return PostizHttpError(
            status, "Postiz rejected the file as too large (413). Raise the reverse proxy body-size limit, "
                    "for example nginx client_max_body_size.")
    if status == 429:
        return PostizHttpError(status, "Postiz hourly create-post limit reached (429). Try again later.")
    return PostizHttpError(status, body_message(error) or f"Postiz returned HTTP {status}.")


def postiz_call(request, timeout):
    """Send one Postiz request through POSTIZ_OPENER. Returns the parsed JSON body or raises a PostizError."""
    try:
        with POSTIZ_OPENER.open(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise http_error(error) from None
    except (OSError, http.client.HTTPException) as error:
        raise PostizTransientError(f"could not reach Postiz ({type(error).__name__}).") from None
    except ValueError:
        raise PostizError("Postiz returned a response that is not JSON.") from None


def multipart_name(name):
    """Quote a filename for Content-Disposition: backslash and double quote are escaped, CR and LF become spaces."""
    cleaned = name.replace("\r", " ").replace("\n", " ")
    return cleaned.replace("\\", "\\\\").replace('"', '\\"')


def redact(text, key):
    """Replace the API key in text. Postiz messages can echo the key, so every printed message passes here."""
    return text.replace(key, "<redacted>") if key else text


def upload_request(url, key, mp4):
    """POST /public/v1/upload with one multipart/form-data file part. The boundary is random for each request."""
    boundary = secrets.token_hex(16)
    with open(mp4, "rb") as handle:
        content = handle.read()
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{multipart_name(os.path.basename(mp4))}"\r\n'
        "Content-Type: video/mp4\r\n\r\n"
    ).encode("utf-8")
    body = head + content + f"\r\n--{boundary}--\r\n".encode("utf-8")
    return urllib.request.Request(
        f"{url}/public/v1/upload", data=body, method="POST",
        headers={"Authorization": key, "Content-Type": f"multipart/form-data; boundary={boundary}"},
    )


def upload_video(url, key, mp4):
    """Upload the render. Retries once after a transient error. Returns the {id, path} media entry."""
    try:
        data = postiz_call(upload_request(url, key, mp4), TIMEOUT_UPLOAD)
    except PostizTransientError:
        data = postiz_call(upload_request(url, key, mp4), TIMEOUT_UPLOAD)
    if not isinstance(data, dict) or "id" not in data or "path" not in data:
        raise PostizError("Postiz returned an unexpected upload response.")
    return {"id": data["id"], "path": data["path"]}


def post_ids(data):
    """Post IDs from POST /posts: a list of {postId, integration} objects, or one object with postId or id."""
    items = data if isinstance(data, list) else [data] if isinstance(data, dict) else []
    ids = []
    for item in items:
        value = (item.get("postId") or item.get("id")) if isinstance(item, dict) else None
        if value:
            ids.append(str(value))
    return ids


def create_post(url, key, plan):
    """POST /public/v1/posts once. Never retried. Returns the post IDs found in the response."""
    request = urllib.request.Request(
        f"{url}/public/v1/posts", data=json.dumps(plan, ensure_ascii=False).encode("utf-8"), method="POST",
        headers={"Authorization": key, "Content-Type": "application/json"},
    )
    try:
        data = postiz_call(request, TIMEOUT_POST)
    except PostizHttpError:
        raise
    except PostizError:
        raise PostizError("Post outcome unknown, check Postiz before re-running.") from None
    return [redact(value, key) for value in post_ids(data)]


def file_sha256(mp4):
    with open(mp4, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def read_receipt():
    """The receipt object from postiz-receipt.json in the project root, or None when missing or not an object."""
    try:
        with open(RECEIPT, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def check_receipt(mp4, post_type, again):
    """Receipt guard. Returns the MP4 sha256. A matching receipt blocks schedule and now unless again is set."""
    digest = file_sha256(mp4)
    receipt = read_receipt()
    if receipt is None or receipt.get("sha256") != digest:
        return digest
    if post_type == "draft":
        print(f"warning: {mp4} was already posted as {receipt.get('type')}; posting a draft again.", file=sys.stderr)
    elif not again:
        sys.exit(f"{mp4} was already posted as {receipt.get('type')}. Pass --again to post it again.")
    return digest


def write_receipt(digest, post_type, ids):
    with open(RECEIPT, "w", encoding="utf-8") as out:
        json.dump({"sha256": digest, "type": post_type, "postIds": ids}, out, indent=2)
        out.write("\n")


def build_plan(post_type, when, channels, config, media):
    """The POST /posts body. date is the --schedule value, or the current UTC time for draft and now."""
    date = when or datetime.datetime.now(datetime.timezone.utc)
    return {
        "type": post_type,
        "date": date.isoformat(),
        "shortLink": False,
        "tags": [],
        "posts": [build_post(channel, config, media) for channel in channels],
    }


class RedactingStream:
    """Wrap stdout or stderr so no write can carry the key, whatever builds the text."""

    def __init__(self, stream, key):
        self.stream, self.key = stream, key

    def write(self, text):
        return self.stream.write(redact(text, self.key))

    def __getattr__(self, name):
        return getattr(self.stream, name)


def main(argv):
    key = os.environ.get("POSTIZ_API_KEY")
    stdout, stderr = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = RedactingStream(stdout, key), RedactingStream(stderr, key)
    try:
        run(argv)
    except SystemExit as caught:
        # Every exit message passes here, so server text that echoes the key is redacted in one place.
        if isinstance(caught.code, str):
            sys.exit(redact(caught.code, key))
        raise
    finally:
        sys.stdout, sys.stderr = stdout, stderr


def run(argv):
    if argv == ["channels"]:
        url, key = get_config()
        for channel in fetch_integrations(url, key):
            flag = "\t(disabled)" if channel.get("disabled") else ""
            print(redact(f"{channel.get('id')}\t{channel.get('identifier')}\t{channel.get('name')}{flag}", key))
        return

    parser = argparse.ArgumentParser(description="Upload a finished 9:16 MP4 to Postiz and create one post.")
    parser.add_argument("mp4", help="finished render, relative to the project root")
    parser.add_argument("--dry-run", action="store_true", help="run every check and print the plan; send no upload or post")
    timing = parser.add_mutually_exclusive_group()
    timing.add_argument("--schedule", metavar="ISO8601", help="publish at this time, with a timezone offset")
    timing.add_argument("--now", action="store_true", help="publish immediately")
    parser.add_argument("--again", action="store_true", help="allow posting the same file again")
    args = parser.parse_args(argv)

    url, key = get_config()
    config = load_project_config("postiz.json")
    blocks, warnings = preflight(args.mp4, config, args.schedule)
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    fail_on(blocks)
    if not config.get("channels"):
        sys.exit("postiz.json lists no channels.")
    channels = resolve_channels(config["channels"], fetch_integrations(url, key))
    fail_on(platform_blocks(channels, config))

    when = parse_schedule(args.schedule) if args.schedule else None
    post_type = "schedule" if when else "now" if args.now else "draft"
    host = urllib.parse.urlparse(url).netloc
    if args.dry_run:
        print(f"uploads to {host}")
        plan = build_plan(post_type, when, channels, config, PLACEHOLDER_MEDIA)
        print(redact(json.dumps(plan, indent=2, ensure_ascii=False), key))
        return

    digest = check_receipt(args.mp4, post_type, args.again)
    print(f"uploads to {host}")
    try:
        media = upload_video(url, key, args.mp4)
        post_ids_found = create_post(url, key, build_plan(post_type, when, channels, config, [media]))
    except PostizError as error:
        sys.exit(str(error))
    try:
        write_receipt(digest, post_type, post_ids_found)
    except OSError as error:
        sys.exit(f"Post created, but {RECEIPT} could not be written: {error.strerror}. "
                 f"Post IDs: {', '.join(post_ids_found) or 'none returned'}.")
    print(f"post IDs: {', '.join(post_ids_found) or 'none returned'}")
    print("review in Postiz")


if __name__ == "__main__":
    main(sys.argv[1:])
