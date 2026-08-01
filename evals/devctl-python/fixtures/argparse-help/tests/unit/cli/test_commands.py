import contextlib
import io
import unittest

from admin_cli.cli.main import main


class _Operations:
    def __init__(self, prefix: str, listed: tuple[str, ...]) -> None:
        self.prefix = prefix
        self.listed = listed
        self.calls: list[tuple[str, str | None]] = []

    def install(self, name: str) -> str:
        self.calls.append(("install", name))
        return f"{self.prefix}:{name}"

    def list(self) -> tuple[str, ...]:
        self.calls.append(("list", None))
        return self.listed


class _Deps:
    def __init__(self) -> None:
        self.packages = _Operations("package", ("pkg-a", "pkg-b"))
        self.agents = _Operations("agent", ("agent-a", "agent-b"))


class CommandTests(unittest.TestCase):
    def invoke(self, argv: list[str]) -> tuple[int, str, str]:
        stdout = io.StringIO()
        stderr = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            code = main(argv, _Deps())
        return code, stdout.getvalue(), stderr.getvalue()

    def test_all_executable_leaves(self) -> None:
        cases = (
            (["package", "install", "demo"], "package:demo\n"),
            (["package", "list"], "pkg-a\npkg-b\n"),
            (["agent", "install", "demo"], "agent:demo\n"),
            (["agent", "list"], "agent-a\nagent-b\n"),
        )
        for argv, expected in cases:
            with self.subTest(argv=argv):
                self.assertEqual(self.invoke(argv), (0, expected, ""))
