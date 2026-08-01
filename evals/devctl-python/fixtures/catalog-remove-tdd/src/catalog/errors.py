"""Catalog errors."""


class CatalogError(Exception):
    """Base catalog error."""


class InvalidPackageNameError(CatalogError):
    """The package name is unsafe."""


class CatalogNotFoundError(CatalogError):
    """The requested package does not exist."""
