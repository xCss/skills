import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "scripts" / "bilibili_publish_cli.py"
LEGACY_GENERATOR = ROOT / "scripts" / "generate_legacy_bilibili_poster.py"
SCAFFOLD_CLI = ROOT / "scripts" / "skill-content-cli.py"


def run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(CLI), *args],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


class BilibiliPublishCliTest(unittest.TestCase):
    def test_complete_migration_uses_single_domain_cli_without_legacy_wrappers(self) -> None:
        self.assertTrue(CLI.exists())
        self.assertFalse(LEGACY_GENERATOR.exists())
        self.assertFalse(SCAFFOLD_CLI.exists())

    def test_doctor_returns_json_contract(self) -> None:
        result = run_cli("doctor")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["command"], "doctor")
        self.assertIn("data", payload)
        self.assertIn("warnings", payload)

    def test_generate_html_from_fixtures_returns_json_and_keeps_no_wrapper_paths(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            view = tmp / "view.json"
            comments = tmp / "comments.json"
            out = tmp / "poster.html"
            view.write_text(
                json.dumps(
                    {
                        "bvid": "BV1Ai9eBKEU4",
                        "aid": 123456,
                        "title": "测试视频标题",
                        "pic": "",
                        "duration": 83,
                        "stat": {"reply": 2, "danmaku": 18},
                        "owner": {"name": "测试UP"},
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            comments.write_text(
                json.dumps(
                    [
                        {
                            "member": {"uname": "观众A", "avatar": ""},
                            "content": {"message": "这是一条热门评论"},
                            "like": 42,
                            "ctime": 1700000000,
                            "rcount": 3,
                            "reply_control": {"location": "IP属地：上海"},
                        }
                    ],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            result = run_cli(
                "generate",
                "--url",
                "https://www.bilibili.com/video/BV1Ai9eBKEU4/",
                "--view-json",
                str(view),
                "--comments-json",
                str(comments),
                "--format",
                "html",
                "--out",
                str(out),
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            payload = json.loads(result.stdout)
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["command"], "generate")
            self.assertEqual(payload["file"], str(out))
            self.assertEqual(payload["mime"], "text/html")
            self.assertEqual(payload["warnings"], [])
            html = out.read_text(encoding="utf-8")
            self.assertIn("测试视频标题", html)
            self.assertIn("b23.tv/BV1Ai9eBKEU4", html)

    def test_cleanup_removes_files_and_reports_json(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "remove-me.txt"
            target.write_text("x", encoding="utf-8")
            result = run_cli("cleanup", str(target))
            self.assertEqual(result.returncode, 0, result.stderr)
            payload = json.loads(result.stdout)
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["command"], "cleanup")
            self.assertEqual(payload["removed"], [str(target)])
            self.assertFalse(target.exists())

    def test_cleanup_rejects_paths_outside_temp_root(self) -> None:
        result = run_cli("cleanup", str(ROOT / "SKILL.md"))
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["removed"], [])
        self.assertTrue(payload["warnings"])

    def test_fixture_mode_does_not_fetch_remote_assets(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            view = tmp / "view.json"
            comments = tmp / "comments.json"
            out = tmp / "poster.html"
            view.write_text(
                json.dumps(
                    {
                        "bvid": "BV1Ai9eBKEU4",
                        "aid": 123456,
                        "title": "离线fixture",
                        "pic": "https://example.com/should-not-fetch.jpg",
                        "duration": 83,
                        "stat": {"reply": 1, "danmaku": 2},
                        "owner": {"name": "测试UP"},
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            comments.write_text(
                json.dumps(
                    [{"member": {"uname": "观众A", "avatar": "https://example.com/avatar.jpg"}, "content": {"message": "离线评论"}, "like": 1, "ctime": 1700000000, "rcount": 0}],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            result = run_cli("generate", "--url", "BV1Ai9eBKEU4", "--view-json", str(view), "--comments-json", str(comments), "--format", "html", "--out", str(out), "--allow-remote-assets")

            self.assertEqual(result.returncode, 0, result.stderr)
            payload = json.loads(result.stdout)
            self.assertTrue(payload["ok"])
            self.assertTrue(out.exists())

    def test_self_test_returns_single_json_payload(self) -> None:
        result = run_cli("self-test")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["command"], "self-test")
        self.assertTrue(payload["data"]["output_exists"])


if __name__ == "__main__":
    unittest.main()
