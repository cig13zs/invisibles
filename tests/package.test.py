from __future__ import annotations

import hashlib
import importlib.util
import tempfile
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "package.py"
spec = importlib.util.spec_from_file_location("invisibles_package", SCRIPT)
assert spec and spec.loader
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)

source_files = package.source_files()
expected_names = [path.relative_to(package.SOURCE).as_posix() for path in source_files]

with tempfile.TemporaryDirectory() as first_dir, tempfile.TemporaryDirectory() as second_dir:
    first_zip, first_checksum, first_digest = package.build(Path(first_dir))
    second_zip, second_checksum, second_digest = package.build(Path(second_dir))

    payload = first_zip.read_bytes()
    assert payload == second_zip.read_bytes(), "two clean package builds differ"
    assert first_digest == second_digest == hashlib.sha256(payload).hexdigest()
    assert first_checksum.read_text(encoding="ascii") == f"{first_digest}  {first_zip.name}\n"
    assert second_checksum.read_text(encoding="ascii") == f"{second_digest}  {second_zip.name}\n"

    with ZipFile(first_zip) as bundle:
        assert bundle.namelist() == expected_names
        assert "manifest.json" in bundle.namelist()
        assert all(info.date_time == package.FIXED_TIME for info in bundle.infolist())
        for path in source_files:
            name = path.relative_to(package.SOURCE).as_posix()
            assert bundle.read(name) == package.normalized_bytes(path)

print(f"ok, deterministic Invisibles package {first_digest}")
