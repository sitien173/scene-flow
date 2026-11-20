# Starts, checks, and stops the Colab GPU session that runs colab/server.py, using the colab CLI.
#
#   python "<skill>/scripts/colab-session.py" up       # new T4 session, install, start server, wait for /health
#   python "<skill>/scripts/colab-session.py" status
#   python "<skill>/scripts/colab-session.py" down     # stop the session, delete the session file
#
# up reuses a healthy server. The URL and token go to colab.STATE_PATH (mode 0600), which colab.py
# reads when COLAB_URL and COLAB_TOKEN are not set in ~/.config/scene-flow/.env. The token is never printed. Each session spends
# Colab compute units until down runs.
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from colab import STATE_PATH

SERVER = Path(__file__).resolve().parent.parent / "colab" / "server.py"
PACKAGES = ["vieneu==3.8.4", "openai-whisper", "fastapi", "uvicorn"]
REMOTE_DIR = "/content"
REMOTE_STATE = REMOTE_DIR + "/.scene-flow-colab.json"
INSTALL_TIMEOUT = 1200
TUNNEL_TIMEOUT = 180
READY_TIMEOUT = 900


def colab(*args, stdin=None, timeout=120):
    """Run a colab CLI command; return its combined output, exit on failure."""
    try:
        done = subprocess.run(["colab", *args], input=stdin, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        sys.exit("colab %s timed out after %d s" % (args[0], timeout))
    out = done.stdout + done.stderr
    if done.returncode:
        sys.exit("colab %s failed:\n%s" % (args[0], out.strip()))
    return out


def remote(session, code, timeout):
    """Run Python in the session kernel; exit unless it prints the done marker."""
    out = colab("exec", "-s", session, "--timeout", "0", stdin=code + "\nprint('SCENE_FLOW_OK')\n", timeout=timeout)
    if "SCENE_FLOW_OK" not in out:
        sys.exit("Colab step failed:\n%s" % out.strip()[-2000:])


def health(url):
    try:
        with urllib.request.urlopen(url.rstrip("/") + "/health", timeout=10) as response:
            return response.status
    except (urllib.error.URLError, OSError):
        return None


def load_state():
    return json.loads(STATE_PATH.read_text(encoding="utf-8")) if STATE_PATH.is_file() else None


def up(session, gpu):
    state = load_state()
    if state and health(state["url"]) == 200:
        print("Colab server already up: %s (session %s)" % (state["url"], state.get("session", "?")))
        return
    if not SERVER.is_file():
        sys.exit("missing %s" % SERVER)

    if "not found" in colab("status", "-s", session):
        print("creating %s session %s" % (gpu, session))
        colab("new", "-s", session, "--gpu", gpu, timeout=600)
    else:
        print("reusing session %s" % session)

    print("installing %s" % " ".join(PACKAGES))
    remote(session, "import subprocess, sys\nsubprocess.run([sys.executable, '-m', 'pip', 'install', '-q', %s], check=True)"
           % ", ".join(repr(p) for p in PACKAGES), INSTALL_TIMEOUT)

    colab("upload", "-s", session, str(SERVER), REMOTE_DIR + "/server.py")
    print("starting server")
    remote(session, "\n".join([
        "import os, subprocess, sys",
        "subprocess.run(['pkill', '-f', 'server.py --state'])",
        "if os.path.exists(%r): os.remove(%r)" % (REMOTE_STATE, REMOTE_STATE),
        "log = open(%r, 'w')" % (REMOTE_DIR + "/server.log"),
        "subprocess.Popen([sys.executable, %r, '--state', %r], cwd=%r, stdout=log, stderr=subprocess.STDOUT,"
        " start_new_session=True)" % (REMOTE_DIR + "/server.py", REMOTE_STATE, REMOTE_DIR),
    ]), 120)

    # the server writes the state file once the tunnel URL is known, then loads VieNeu before listening
    with tempfile.TemporaryDirectory() as tmp:
        local = Path(tmp) / "state.json"
        deadline = time.time() + TUNNEL_TIMEOUT
        while True:
            subprocess.run(["colab", "download", "-s", session, REMOTE_STATE, str(local)],
                           capture_output=True, timeout=120)
            if local.is_file() and local.stat().st_size:
                state = json.loads(local.read_text(encoding="utf-8"))
                break
            if time.time() > deadline:
                sys.exit("no tunnel URL after %d s; see %s/server.log on the session" % (TUNNEL_TIMEOUT, REMOTE_DIR))
            time.sleep(10)
    remote(session, "import os\nos.remove(%r)" % REMOTE_STATE, 120)

    state["session"] = session
    STATE_PATH.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    with os.fdopen(os.open(STATE_PATH, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as f:
        json.dump(state, f)

    print("waiting for %s/health while the server loads VieNeu" % state["url"])
    deadline = time.time() + READY_TIMEOUT
    while health(state["url"]) != 200:
        if time.time() > deadline:
            sys.exit("server not healthy after %d s; see %s/server.log on the session" % (READY_TIMEOUT, REMOTE_DIR))
        time.sleep(15)
    print("Colab server up: %s (session %s). Run down when voice and ASR are done." % (state["url"], session))


def status(session):
    state = load_state()
    if not state:
        print("no session file at %s" % STATE_PATH)
    else:
        code = health(state["url"])
        print("server %s: %s (session %s)" % (state["url"], "healthy" if code == 200 else "not reachable (%s)" % code,
                                              state.get("session", "?")))
    print(colab("status", "-s", state.get("session", session) if state else session).strip())


def down(session):
    state = load_state()
    session = state.get("session", session) if state else session
    print(colab("stop", "-s", session).strip())
    if STATE_PATH.is_file():
        STATE_PATH.unlink()
        print("deleted %s" % STATE_PATH)


def main():
    parser = argparse.ArgumentParser(description="Manage the Colab session for ASR and TTS.")
    parser.add_argument("action", choices=["up", "status", "down"])
    parser.add_argument("--session", default="scene-flow", help="colab session name (default scene-flow)")
    parser.add_argument("--gpu", default="T4", help="GPU for a new session (default T4)")
    args = parser.parse_args()
    if not shutil.which("colab"):
        sys.exit("colab CLI not found on PATH; install it and sign in, or start colab/server.py by hand")
    {"up": lambda: up(args.session, args.gpu), "status": lambda: status(args.session),
     "down": lambda: down(args.session)}[args.action]()


if __name__ == "__main__":
    main()
