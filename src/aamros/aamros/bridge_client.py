"""
Author: Maaz Shaikh
PRN: 1032233996
Utility: RPC Bridge Client for STM32 communication - Robust Version
"""

import socket
import msgpack
import threading
import time

SOCKET_PATH = '/run/arduino-router.sock'
TIMEOUT = 1.0       # generous enough for STM32 to respond
MAX_RETRIES = 3     # retry count before giving up
RETRY_DELAY = 0.05  # 50ms between retries

class BridgeClient:
    def __init__(self):
        self._lock = threading.Lock()
        self._sock = None
        self._msg_id = 0
        self._connect()

    def _connect(self):
        """Blocking reconnect with backoff — keeps retrying until router is available."""
        while True:
            try:
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.settimeout(TIMEOUT)
                sock.connect(SOCKET_PATH)
                self._sock = sock
                print('[BridgeClient] Connected to arduino-router')
                return
            except Exception as e:
                print(f'[BridgeClient] Connection failed: {e} — retrying in 1s')
                time.sleep(1)

    def _reconnect(self):
        """Close stale socket and reconnect."""
        try:
            if self._sock:
                self._sock.close()
        except Exception:
            pass
        self._sock = None
        self._connect()

    def call(self, method, params=[]):
        """
        Thread-safe RPC call with retry and auto-reconnect.
        Returns response value or None on total failure.
        """
        with self._lock:
            for attempt in range(MAX_RETRIES):
                try:
                    # increment message id for each call
                    self._msg_id = (self._msg_id + 1) % 65535

                    msg = msgpack.packb([0, self._msg_id, method, params])
                    self._sock.sendall(msg)

                    data = b''
                    while True:
                        chunk = self._sock.recv(4096)
                        if not chunk:
                            raise ConnectionError('Socket closed by router')
                        data += chunk
                        try:
                            response = msgpack.unpackb(
                                data,
                                strict_map_key=False,
                                max_array_len=100
                            )
                            return response[3]
                        except msgpack.exceptions.UnpackValueError:
                            continue

                except (socket.timeout, socket.error, ConnectionError, OSError) as e:
                    print(f'[BridgeClient] Call failed (attempt {attempt+1}/{MAX_RETRIES}): {e}')
                    self._reconnect()
                    time.sleep(RETRY_DELAY)

            print(f'[BridgeClient] {method} failed after {MAX_RETRIES} attempts — returning None')
            return None

# single shared instance — import this everywhere
bridge = BridgeClient()

def rpc_call(method, params=[]):
    return bridge.call(method, params)
