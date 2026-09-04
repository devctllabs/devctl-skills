from pathlib import Path

from package_discovery.errors import PackageCatalogError


class FilesystemPackageCatalog:
    """Discover package metadata stored directly below one root."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def package_names(self) -> tuple[str, ...]:
        try:
            return tuple(sorted(path.stem for path in self._root.glob("*.toml")))
        except OSError as error:
            raise PackageCatalogError("could not load package metadata") from error
