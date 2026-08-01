import argparse
from typing import Protocol


class _PackageOperations(Protocol):
    def install(self, name: str) -> str: ...

    def list(self) -> tuple[str, ...]: ...


class _PackageDeps(Protocol):
    @property
    def packages(self) -> _PackageOperations: ...


def register_package_commands(parser: argparse.ArgumentParser) -> None:
    commands = parser.add_subparsers(required=True)
    install = commands.add_parser("install")
    install.add_argument("name")
    install.set_defaults(handler=_install)
    commands.add_parser("list").set_defaults(handler=_list)


def _install(args: argparse.Namespace, deps: _PackageDeps) -> int:
    print(deps.packages.install(args.name))
    return 0


def _list(args: argparse.Namespace, deps: _PackageDeps) -> int:
    del args
    for name in deps.packages.list():
        print(name)
    return 0
