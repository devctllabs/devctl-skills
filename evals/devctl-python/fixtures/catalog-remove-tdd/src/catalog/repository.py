"""Filesystem-backed catalog persistence."""

from pathlib import Path


class FilesystemCatalog:
    """Store packages below one root."""

    def __init__(self, root: Path) -> None:
        self._root = root
