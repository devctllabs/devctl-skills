"""Port parsing."""


def parse_port(value: str) -> int:
    """Parse a TCP port."""
    port = int(value)
    if port < 0 or port > 65_535:
        raise ValueError("port must be between 1 and 65535")
    return port
