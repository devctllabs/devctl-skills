import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parents[3] / "src"))

from package_discovery.repository import FilesystemPackageCatalog


class FilesystemPackageCatalogTests(unittest.TestCase):
    def test_lists_only_toml_metadata_from_an_isolated_root(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "beta.toml").write_text("", encoding="utf-8")
            (root / "alpha.toml").write_text("", encoding="utf-8")
            (root / "notes.txt").write_text("", encoding="utf-8")

            self.assertEqual(
                FilesystemPackageCatalog(root).package_names(),
                ("alpha", "beta"),
            )


if __name__ == "__main__":
    unittest.main()
