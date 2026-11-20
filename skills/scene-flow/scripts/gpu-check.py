# Checks this machine for a GPU that can run ASR and VieNeu-TTS locally instead of on Colab.
#
#   python "<skill>/scripts/gpu-check.py"
#
# Prints what it found, then "recommendation: local" or "recommendation: colab" with the install
# steps that are still missing. Local means asr.py --local (whisper.cpp through hyperframes transcribe)
# and tts.py --provider local (VieNeu-TTS in this Python). Run from the skill; not copied into projects.
import importlib.util
import os
import platform
import shutil
import subprocess
import sys


def nvidia():
    """Return 'name, memory' for each NVIDIA GPU that nvidia-smi reports."""
    if not shutil.which("nvidia-smi"):
        return []
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                             capture_output=True, text=True, timeout=15).stdout
    except (OSError, subprocess.TimeoutExpired):
        return []
    return [line.strip() for line in out.splitlines() if line.strip()]


gpus = nvidia()
apple = sys.platform == "darwin" and platform.machine() == "arm64"
whisper = os.environ.get("HYPERFRAMES_WHISPER_PATH") or shutil.which("whisper-cli")
vieneu = importlib.util.find_spec("vieneu") is not None

if gpus:
    print("GPU: NVIDIA " + "; ".join(gpus))
elif apple:
    print("GPU: Apple Silicon (Metal)")
else:
    print("GPU: none found (nvidia-smi missing or no Apple Silicon)")
print("whisper-cli: %s" % (whisper or "not found"))
print("vieneu: %s" % ("installed in %s" % sys.executable if vieneu else "not installed"))

if not gpus and not apple:
    print("\nrecommendation: colab")
    sys.exit(0)

print("\nrecommendation: local")
if not whisper:
    if apple:
        print("  whisper.cpp with Metal:  brew install whisper-cpp")
    else:
        # hyperframes builds whisper.cpp itself with a plain `cmake -B build`, which is CPU only
        print("  whisper.cpp with CUDA:")
        print("    git clone https://github.com/ggml-org/whisper.cpp && cd whisper.cpp")
        print("    cmake -B build -DGGML_CUDA=1 && cmake --build build -j --config Release")
        print("    then set HYPERFRAMES_WHISPER_PATH to the full path of build/bin/whisper-cli")
if not vieneu:
    if apple:
        print('  VieNeu-TTS (ONNX, faster than MPS on Apple Silicon):  pip install "vieneu==3.8.4"')
    else:
        print('  VieNeu-TTS on CUDA 12.8+:  pip install "vieneu[cuda]==3.8.4"')
        print("    on Windows, install the CUDA build of torch first (VieNeu-TTS README)")
print("  ASR:  python scripts/asr.py small --local")
print("  TTS:  python scripts/tts.py --provider local [--voice \"<name>\" | --ref \"<clip.wav>\"]")
