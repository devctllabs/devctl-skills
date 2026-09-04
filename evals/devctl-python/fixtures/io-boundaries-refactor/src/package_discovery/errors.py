class PackageDiscoveryError(RuntimeError):
    """Base error for package-discovery integrations."""


class PluginClientError(PackageDiscoveryError):
    """Raised when plugin metadata cannot be loaded."""


class PackageCatalogError(PackageDiscoveryError):
    """Raised when local package metadata cannot be loaded."""
