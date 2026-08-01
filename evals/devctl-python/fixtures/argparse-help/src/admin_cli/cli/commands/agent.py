import argparse
from typing import Protocol


class _AgentOperations(Protocol):
    def install(self, name: str) -> str: ...

    def list(self) -> tuple[str, ...]: ...


class _AgentDeps(Protocol):
    @property
    def agents(self) -> _AgentOperations: ...


def register_agent_commands(parser: argparse.ArgumentParser) -> None:
    commands = parser.add_subparsers(required=True)
    install = commands.add_parser("install")
    install.add_argument("name")
    install.set_defaults(handler=_install)
    commands.add_parser("list").set_defaults(handler=_list)


def _install(args: argparse.Namespace, deps: _AgentDeps) -> int:
    print(deps.agents.install(args.name))
    return 0


def _list(args: argparse.Namespace, deps: _AgentDeps) -> int:
    del args
    for name in deps.agents.list():
        print(name)
    return 0
