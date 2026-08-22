#!/usr/bin/env python3
"""Build or verify Invisibles' deterministic Chrome extension package."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension"
DEFAULT_OUTPUT = ROOT / "dist"
FIXED_TIME = (2000, 1, 1, 0, 0, 0)
TEXT_SUFFIXES = {".css", ".html", ".js", ".json", ".md", ".txt"}


def source_files() -> list[Path]:
    files = sorted(path for path in SOURCE.rglob("*") if path.is_file())
    if not files or not (SOURCE / "manifest.json").is_file():
        raise SystemExit("extension/manifest.json is missing")
    for path in files:
        relative = path.relative_to(SOURCE)
        if any(part.startswith(".") for part in relative.parts):
            raise SystemExit(f"hidden extension file is not allowed: {relative}")
    return files


def normalized_bytes(path: Path) -> bytes:
    data = path.read_bytes()
    if path.suffix.lower() in TEXT_SUFFIXES:
        if data.startswith(b"\xef\xbb\xbf"):
            raise SystemExit(f"UTF-8 BOM is not allowed: {path.relative_to(SOURCE)}")
        data = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    return data


def validate_manifest(files: list[Path]) -> dict[str, object]:
    manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("manifest_version") != 3:
        raise SystemExit("manifest_version must be 3")
    if manifest.get("permissions") != ["sidePanel"]:
        raise SystemExit("Invisibles must request only the sidePanel permission")
    for broad_access in ("host_permissions", "content_scripts", "optional_permissions"):
        if manifest.get(broad_access):
            raise SystemExit(f"unexpected manifest access: {broad_access}")

    names = {path.relative_to(SOURCE).as_posix() for path in files}
    required = {
        manifest.get("side_panel", {}).get("default_path"),
        manifest.get("background", {}).get("service_worker"),
        *(manifest.get("icons") or {}).values(),
        *((manifest.get("action") or {}).get("default_icon") or {}).values(),
    }
    missing = sorted(str(name) for name in required if not name or name not in names)
    if missing:
        raise SystemExit("missing manifest resources: " + ", ".join(missing))
    return manifest


def expected_archive() -> tuple[bytes, str, str]:
    files = source_files()
    manifest = validate_manifest(files)
    output = io.BytesIO()
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in files:
            name = path.relative_to(SOURCE).as_posix()
            info = ZipInfo(name, FIXED_TIME)
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, normalized_bytes(path), compress_type=ZIP_DEFLATED, compresslevel=9)
    payload = output.getvalue()
    digest = hashlib.sha256(payload).hexdigest()
    filename = f"invisibles-{manifest['version']}.zip"
    return payload, digest, filename


def build(output_dir: Path) -> tuple[Path, Path, str]:
    payload, digest, filename = expected_archive()
    output_dir.mkdir(parents=True, exist_ok=True)
    archive = output_dir / filename
    checksum = output_dir / f"{filename}.sha256"
    archive.write_bytes(payload)
    checksum.write_text(f"{digest}  {filename}\n", encoding="ascii", newline="\n")
    return archive, checksum, digest


def check(output_dir: Path) -> tuple[Path, Path, str]:
    payload, digest, filename = expected_archive()
    archive = output_dir / filename
    checksum = output_dir / f"{filename}.sha256"
    if not archive.is_file() or archive.read_bytes() != payload:
        raise SystemExit(f"stale or missing archive: {archive}")
    expected_checksum = f"{digest}  {filename}\n"
    if not checksum.is_file() or checksum.read_text(encoding="ascii") != expected_checksum:
        raise SystemExit(f"stale or missing checksum: {checksum}")
    return archive, checksum, digest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    output_dir = args.output_dir.resolve()
    archive, checksum, digest = check(output_dir) if args.check else build(output_dir)
    print(f"ZIP={archive}")
    print(f"SHA256={digest}")
    print(f"CHECKSUM={checksum}")


if __name__ == "__main__":
    main()
