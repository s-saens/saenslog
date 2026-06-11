#!/usr/bin/env bash
# static/blog·static/musics의 미디어 파일을 R2 버킷(saenslog-media)에 업로드한다.
# 사용법: scripts/upload-media-to-r2.sh [--local]
#   --local : wrangler dev용 로컬 시뮬레이션 R2에 업로드
set -euo pipefail

cd "$(dirname "$0")/.."

BUCKET="saenslog-media"
MODE="--remote"
if [[ "${1:-}" == "--local" ]]; then
	MODE="--local"
fi

content_type() {
	case "${1##*.}" in
		png) echo "image/png" ;;
		jpg | jpeg) echo "image/jpeg" ;;
		gif) echo "image/gif" ;;
		webp) echo "image/webp" ;;
		svg) echo "image/svg+xml" ;;
		avif) echo "image/avif" ;;
		mp3) echo "audio/mpeg" ;;
		ogg) echo "audio/ogg" ;;
		wav) echo "audio/wav" ;;
		m4a) echo "audio/mp4" ;;
		aac) echo "audio/aac" ;;
		flac) echo "audio/flac" ;;
		*) echo "application/octet-stream" ;;
	esac
}

count=0
find static/blog static/musics -type f | while read -r f; do
	key="${f#static/}"
	ct="$(content_type "$f")"
	echo "[$((++count))] $key ($ct)"
	npx wrangler r2 object put "$BUCKET/$key" --file "$f" --content-type "$ct" "$MODE"
done

echo "업로드 완료"
