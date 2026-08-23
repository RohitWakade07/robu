"""
Author: Maaz Shaikh
PRN: 1032233996

PATCHED: the original rpc_call() re-parsed a growing byte buffer with
msgpack.unpackb() in a loop and relied on sock.settimeout(0.1) to bound it.
That timeout only bounds each individual recv() call, not the loop as a whole --
if the router ever sends bytes without ever completing a valid message, the loop
had no overall cap (verified locally: it can run seconds past the configured
timeout). This version uses msgpack.Unpacker for correct incremental parsing and
tracks a real wall-clock deadline across the whole call.
"""
import socket
import time
import msgpack

SOCKET_PATH = '/run/arduino-router.sock'
RPC_TIMEOUT_S = 0.1


def rpc_call(method, params=[]):
    deadline = time.monotonic() + RPC_TIMEOUT_S
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
            sock.settimeout(RPC_TIMEOUT_S)
            sock.connect(SOCKET_PATH)
            sock.sendall(msgpack.packb([0, 1, method, params]))

            unpacker = msgpack.Unpacker(raw=False, strict_map_key=False, max_array_len=100)
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return None  # hard overall deadline, regardless of how data trickles in
                sock.settimeout(remaining)

                chunk = sock.recv(4096)
                if not chunk:
                    return None  # remote closed the connection

                unpacker.feed(chunk)
                for response in unpacker:  # only yields once a full message is parsed
                    # msgpack-rpc response format: [type, msgid, error, result]
                    return response[3]
    except (socket.timeout, socket.error, msgpack.exceptions.UnpackException):
        return None
