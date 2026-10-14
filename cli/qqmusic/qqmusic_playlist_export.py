# -*- coding: utf-8 -*-
"""
QQ Music Exporter alias without underscore in filename.
"""
import os
import sys

_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_CLI_DIR = os.path.dirname(_CURRENT_DIR)
_REPO_ROOT = os.path.dirname(_CLI_DIR)
for _p in (_REPO_ROOT, _CLI_DIR, _CURRENT_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from cli.qqmusic.qq_music_playlist_export import *

if __name__ == "__main__":
    main()
