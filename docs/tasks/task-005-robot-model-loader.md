# Task: 005 — Robot Model Loader

## Summary

Build the Python module that resolves a robot model name (e.g. `"unitree_g1"`) to a local MJCF file path, downloading and caching it from the S3 `robot-models` bucket (task 002) on cache miss, and falling back to fetching from the public MuJoCo Menagerie GitHub repo when the bucket is empty (first-run bootstrap). This is the "character sheet" described in README.md's architecture table.

## Read First

- `docs/specs/data-models.md` — "S3 Buckets / Object Layout" section for the `robot-models` bucket key convention (`{modelName}/{version}/model.mjcf`), populated by task 002
- `docs/references.md` — "Robot Models — MuJoCo Menagerie" section for the Unitree G1 path

## Conventions

No `.claude/rules/` convention applies to `backend/` Python code (this project's `.claude-stack` only declares `frontend` and `cdk`). Follow PEP 8 and type hints. Use `boto3` for S3 access.

## Requirements

1. The module MUST expose `get_robot_model(model_name: str, version: str, cache_dir: str = "/tmp/robot_models") -> str` returning the local filesystem path to the model's MJCF file.
2. `get_robot_model` MUST check the local `cache_dir` first (Lambda's `/tmp` is retained across warm invocations) — if `{cache_dir}/{model_name}/{version}/model.mjcf` exists, return that path without any network call.
3. On local cache miss, `get_robot_model` MUST attempt to download `{model_name}/{version}/model.mjcf` from the S3 `robot-models` bucket (bucket name from `MODELS_BUCKET_NAME_ENV` environment variable) to `cache_dir`, then return the local path.
4. On S3 cache miss (object not found), `get_robot_model` MUST download the model from the public MuJoCo Menagerie GitHub repo (raw content URL, e.g. `https://raw.githubusercontent.com/google-deepmind/mujoco_menagerie/main/unitree_g1/g1.xml`), save it to both `cache_dir` and upload it to the S3 bucket for future invocations, then return the local path.
5. The module MUST raise `RobotModelNotFoundError` (custom exception) when `model_name` is not in a known-models registry (a hardcoded dict mapping `model_name` to its Menagerie subdirectory/filename) — MUST NOT attempt an arbitrary GitHub fetch for unknown names.
6. Only `unitree_g1` MUST be present in the known-models registry for this task (per the project's hard constraint that Unitree G1 is the sole HMND 01 stand-in) — the registry structure MUST allow adding more models without changing `get_robot_model`'s signature.
7. Menagerie downloads MUST also fetch any MJCF-referenced mesh/asset files (STL/OBJ) listed in the model's `<asset>` XML section, storing them alongside the MJCF file in the same cache directory structure, since MuJoCo cannot load a model with missing mesh references.

## Technical Notes

- Lambda's `/tmp` has a 512 MB–10 GB limit depending on configuration; the Unitree G1 model + meshes is a few MB, well within budget. Don't add cache-eviction logic — out of scope for this task.
- Use `boto3.client("s3").download_file` / `upload_file`, not the resource API, for simplicity and testability with `moto`.
- Mock all network I/O (S3 and GitHub) in tests — use `moto` for S3 and `responses` or `unittest.mock.patch` for the GitHub HTTP calls.

## TDD Plan

### RED — Tests First

| # | Test Name | Asserts | File |
|---|-----------|---------|------|
| 1 | `test_get_robot_model_given_local_cache_hit_should_return_path_without_network_call` | returns path, no S3/HTTP calls made | `backend/tests/test_robot_model_loader.py` |
| 2 | `test_get_robot_model_given_s3_cache_hit_should_download_and_return_local_path` | file written to cache_dir, S3 called, no GitHub call | same |
| 3 | `test_get_robot_model_given_s3_and_local_cache_miss_should_fetch_from_menagerie` | GitHub fetch called, file cached locally and uploaded to S3 | same |
| 4 | `test_get_robot_model_given_unknown_model_name_should_raise_not_found_error` | raises `RobotModelNotFoundError`, no network calls | same |
| 5 | `test_get_robot_model_given_menagerie_fetch_should_also_download_referenced_mesh_assets` | mesh files present in cache_dir alongside MJCF | same |

### GREEN — Implementation Order

1. Create `backend/src/robot_model/registry.py` with the known-models dict (`unitree_g1` → Menagerie path) and `RobotModelNotFoundError`.
2. Create `backend/src/robot_model/loader.py` with local cache check logic.
3. Add S3 cache check/download to `loader.py`.
4. Add Menagerie GitHub fetch (MJCF + mesh assets) and S3 upload-back to `loader.py`.

### REFACTOR

- Extract the mesh-asset-parsing (reading `<asset>` tags from MJCF XML) into a small helper if it grows beyond a few lines — keep `get_robot_model` readable.

## Dependencies

- `TASK-002` — needs the `robot-models` S3 bucket name/env var to exist

## Files to Create/Modify

- `backend/src/robot_model/__init__.py` (create)
- `backend/src/robot_model/registry.py` (create)
- `backend/src/robot_model/loader.py` (create)
- `backend/tests/test_robot_model_loader.py` (create)
- `backend/requirements.txt` (modify — add `boto3`, `requests`, `moto`, `responses`)

## Acceptance Criteria

- [ ] All RED tests written and failing for the right reason
- [ ] All tests GREEN with minimal implementation
- [ ] REFACTOR pass complete, no regressions
- [ ] Local cache hit never triggers a network call
- [ ] Unknown model names raise `RobotModelNotFoundError` before any network I/O
- [ ] Menagerie fetch also retrieves referenced mesh assets

## Spec Updates

- None
