"""
NSG CQB Synthetic Indoor Location Simulator
Simulates real-time tactical movement of House Intervention Teams (HIT)
across building storeys and posts telemetry updates to the FastAPI backend.
"""
import argparse
import asyncio
import math
import random
import signal
import sys
from datetime import datetime, timezone
from typing import List, Dict, Any
import httpx

from config import API_ENDPOINT, UPDATE_INTERVAL_SECONDS, BUILDING_ID, SIMULATED_UNITS


class SimulatedAgent:
    """Simulates an individual tactical personnel unit traversing waypoints."""

    def __init__(self, unit_config: Dict[str, Any]):
        self.device_id = unit_config["device_id"]
        self.name = unit_config["name"]
        self.team = unit_config.get("team", "HIT Alpha")
        self.speed = unit_config.get("speed", 1.0)
        self.waypoints = unit_config["waypoints"]

        # Current location state
        self.current_wp_idx = 0
        self.next_wp_idx = 1 if len(self.waypoints) > 1 else 0
        start_wp = self.waypoints[0]
        self.current_x = float(start_wp["x"])
        self.current_z = float(start_wp["z"])
        self.floor_id = start_wp["floor_id"]

    def step(self, dt: float):
        """Advances agent position towards next waypoint based on speed and delta time."""
        if len(self.waypoints) < 2:
            return

        target_wp = self.waypoints[self.next_wp_idx]
        target_x = float(target_wp["x"])
        target_z = float(target_wp["z"])

        dx = target_x - self.current_x
        dz = target_z - self.current_z
        distance = math.hypot(dx, dz)

        step_dist = self.speed * dt

        if distance <= step_dist or distance < 0.1:
            # Reached waypoint, advance to next in route (cyclic)
            self.current_x = target_x
            self.current_z = target_z
            self.floor_id = target_wp["floor_id"]
            self.current_wp_idx = self.next_wp_idx
            self.next_wp_idx = (self.next_wp_idx + 1) % len(self.waypoints)
        else:
            # Move along vector
            ratio = step_dist / distance
            self.current_x += dx * ratio
            self.current_z += dz * ratio

        # Add realistic micro-jitter (footsteps / sensor noise: +/- 0.04m)
        self.current_x += random.uniform(-0.04, 0.04)
        self.current_z += random.uniform(-0.04, 0.04)

    def get_telemetry_payload(self) -> Dict[str, Any]:
        """Generates payload strictly conforming to docs/API_CONTRACT.md."""
        return {
            "device_id": self.device_id,
            "building_id": BUILDING_ID,
            "floor_id": self.floor_id,
            "position": {
                "x": round(self.current_x, 2),
                "z": round(self.current_z, 2)
            },
            "source": "SIMULATION",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


class LocationSimulator:
    """Orchestrates multi-agent simulation loop and posts telemetry to API."""

    def __init__(self, endpoint: str, interval: float, iterations: int = -1):
        self.endpoint = endpoint
        self.interval = interval
        self.iterations = iterations
        self.running = False
        self.agents: List[SimulatedAgent] = [
            SimulatedAgent(cfg) for cfg in SIMULATED_UNITS
        ]

    async def run(self):
        """Main simulation asynchronous loop."""
        self.running = True
        print("=" * 70)
        print("  NSG CQB LIVE LOCATION TRACKING - SYNTHETIC DATA SIMULATOR")
        print("=" * 70)
        print(f"[*] Target API Endpoint : {self.endpoint}")
        print(f"[*] Broadcast Interval  : {self.interval:.1f}s")
        print(f"[*] Tracked Personnel   : {len(self.agents)} units")
        print(f"[*] Iterations          : {'Infinite' if self.iterations < 0 else self.iterations}")
        print("[-] Press Ctrl+C at any time to halt simulation.\n")

        tick = 0
        async with httpx.AsyncClient(timeout=4.0) as client:
            while self.running:
                tick += 1
                now_str = datetime.now().strftime("%H:%M:%S")

                for agent in self.agents:
                    # Advance agent kinematics
                    agent.step(self.interval)
                    payload = agent.get_telemetry_payload()

                    try:
                        resp = await client.post(self.endpoint, json=payload)
                        status_str = f"HTTP {resp.status_code}" if resp.status_code == 200 else f"ERR {resp.status_code}"
                    except Exception as exc:
                        status_str = f"CONN_ERR ({type(exc).__name__})"

                    pos = payload["position"]
                    print(
                        f"[{now_str} #TICK {tick:04d}] {agent.device_id:<16} | "
                        f"Floor: {agent.floor_id:<8} | "
                        f"Pos: ({pos['x']:>5.1f}, {pos['z']:>5.1f}) | {status_str}"
                    )

                if self.iterations > 0 and tick >= self.iterations:
                    print(f"\n[+] Completed {self.iterations} requested simulation cycles.")
                    break

                try:
                    await asyncio.sleep(self.interval)
                except asyncio.CancelledError:
                    break

        print("\n[*] Simulator successfully stopped.")

    def stop(self):
        self.running = False


def main():
    parser = argparse.ArgumentParser(description="NSG CQB Location Simulator")
    parser.add_argument("--endpoint", default=API_ENDPOINT, help="FastAPI target location ingest URL")
    parser.add_argument("--interval", type=float, default=UPDATE_INTERVAL_SECONDS, help="Interval in seconds")
    parser.add_argument("--iterations", type=int, default=-1, help="Number of ticks (-1 for continuous)")
    args = parser.parse_args()

    simulator = LocationSimulator(
        endpoint=args.endpoint,
        interval=args.interval,
        iterations=args.iterations
    )

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def handle_signal(*_):
        simulator.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, handle_signal)
        except (ValueError, AttributeError):
            pass

    try:
        loop.run_until_complete(simulator.run())
    finally:
        loop.close()


if __name__ == "__main__":
    main()
