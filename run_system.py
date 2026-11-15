#!/usr/bin/env python3
"""
NSG CQB Live Location Tracking System - Unified Master Runner
Starts all system components with a single command for demonstrations and testing.

Usage:
    python run_system.py              # Starts Backend, Frontend, and Simulator
    python run_system.py --no-sim     # Starts Backend and Frontend only
    python run_system.py --help
"""
import argparse
import os
import signal
import subprocess
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
SIMULATOR_DIR = os.path.join(PROJECT_ROOT, "simulator")


def find_python():
    """Finds appropriate Python executable (venv or system)."""
    venv_py = os.path.join(BACKEND_DIR, ".venv", "bin", "python")
    if os.path.isfile(venv_py) and os.access(venv_py, os.X_OK):
        return venv_py
    return sys.executable


def main():
    parser = argparse.ArgumentParser(description="NSG CQB Location Tracking System Runner")
    parser.add_argument("--backend", choices=["node", "python"], default="node", help="Primary backend engine (default: node)")
    parser.add_argument("--no-sim", action="store_true", help="Do not start the synthetic location simulator")
    parser.add_argument("--interval", type=float, default=1.5, help="Simulator update interval in seconds")
    args = parser.parse_args()

    python_bin = find_python()

    print("=" * 72)
    print("  NATIONAL SECURITY GUARD (NSG) - LIVE LOCATION TRACKING SYSTEM")
    print("  Command & Control 3D Multi-Storey Indoor Tracking Prototype")
    print("=" * 72)
    print(f"[*] Project Root : {PROJECT_ROOT}")
    print(f"[*] Backend Type : {args.backend.upper()} (Primary Production Backend)")
    print("[-] Press Ctrl+C at any time to shut down all system processes.\n")

    processes = []

    def shutdown_all(*_):
        print("\n[*] Gracefully stopping all system components...")
        for name, p in processes:
            try:
                print(f"    Stopping {name} (PID: {p.pid})...")
                p.terminate()
                p.wait(timeout=3)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        print("[+] System shutdown complete.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown_all)
    signal.signal(signal.SIGTERM, shutdown_all)

    # 1. Start Primary Backend
    backend_env = os.environ.copy()
    backend_env["PORT"] = "8000"

    if args.backend == "node":
        print("[1/3] Starting Primary Node.js Backend (Express/pg/ws) on http://localhost:8000 ...")
        backend_proc = subprocess.Popen(
            ["npm", "start"],
            cwd=BACKEND_DIR,
            env=backend_env
        )
        processes.append(("Node.js Backend", backend_proc))
    else:
        print("[1/3] Starting Legacy FastAPI Backend on http://localhost:8000 ...")
        backend_env["PYTHONPATH"] = f"{BACKEND_DIR}:{backend_env.get('PYTHONPATH', '')}"
        backend_proc = subprocess.Popen(
            [python_bin, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=BACKEND_DIR,
            env=backend_env
        )
        processes.append(("FastAPI Backend", backend_proc))

    time.sleep(1.5)

    # 2. Start Vite Frontend
    print("[2/3] Starting React + Three.js Frontend on http://localhost:3000 ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", "3000", "--host"],
        cwd=FRONTEND_DIR
    )
    processes.append(("Vite Frontend", frontend_proc))
    time.sleep(2.0)

    # 3. Start Telemetry Simulator (optional)
    if not args.no_sim:
        sim_env = os.environ.copy()
        sim_env["SIMULATOR_INTERVAL_MS"] = str(int(args.interval * 1000))
        sim_env["API_BASE_URL"] = "http://localhost:8000/api"

        if args.backend == "node":
            print(f"[3/3] Starting Node.js Kinematic CQB Simulator (interval: {args.interval}s) ...")
            sim_proc = subprocess.Popen(
                ["npm", "run", "simulate"],
                cwd=BACKEND_DIR,
                env=sim_env
            )
            processes.append(("Node.js Simulator", sim_proc))
        else:
            print(f"[3/3] Starting Python CQB Telemetry Simulator (interval: {args.interval}s) ...")
            sim_proc = subprocess.Popen(
                [python_bin, "main.py", "--interval", str(args.interval)],
                cwd=SIMULATOR_DIR,
                env=sim_env
            )
            processes.append(("CQB Simulator", sim_proc))

    print("\n" + "=" * 72)
    print("  ALL SERVICES ARE RUNNING:")
    print("  • Frontend Dashboard : http://localhost:3000")
    print("  • Backend REST APIs  : http://localhost:8000/api/health")
    print("  • Interactive Docs   : http://localhost:8000/docs")
    print("  • WebSocket Stream   : ws://localhost:8000/ws/locations")
    print("=" * 72)
    print("Listening for updates. Press Ctrl+C to exit.\n")

    # Monitor processes
    while True:
        for name, p in processes:
            ret = p.poll()
            if ret is not None:
                print(f"[!] Warning: {name} exited unexpectedly with code {ret}")
                shutdown_all()
        time.sleep(1)


if __name__ == "__main__":
    main()
