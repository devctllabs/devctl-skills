# Package discovery

The Codex client and filesystem catalog are stable integrations. `PackageService` still contains
legacy direct I/O and must be migrated to consume those integrations through application-owned
capabilities.

Run tests with:

```text
python3 -m unittest discover -s tests
```
