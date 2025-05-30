# /// script
# requires-python = ">=3.12"
# dependencies = ["requests", "ngrok"]
# ///

import argparse
import logging
import os
import re
import sys
import time
import ngrok

def get_tunnel_url(tunnel):
    try:
        return tunnel.url()
    except Exception:
        pass
    return ""

def upsert_env(var, url, filepath):
    entry = f"{var}={url}"
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            if re.match(f"^{re.escape(var)}=", line):
                lines[i] = entry + "\n"
                break
        else:
            lines.append(entry + "\n")
    else:
        lines = [entry + "\n"]
    with open(filepath, "w") as f:
        f.writelines(lines)

def main():
    parser = argparse.ArgumentParser(
        description="Start an ngrok tunnel and upsert its URL into a .env file."
    )
    parser.add_argument("port", nargs="?", default="5173", help="Port to tunnel (default: 5173)")
    parser.add_argument("var", nargs="?", default="APP_URL", help="Environment variable name (default: APP_URL)")
    parser.add_argument("file", nargs="?", default=".env", help="Environment file path (default: .env)")
    args = parser.parse_args()

    logging.debug(f"Starting ngrok on port {args.port}")
    try:
        # Create HTTP tunnel
        tunnel = ngrok.forward(args.port, "http")
        url = get_tunnel_url(tunnel)
        if url:
            logging.debug(f"Found tunnel URL: {url}")
            upsert_env(args.var, url, args.file)
        else:
            print("Failed to get tunnel URL", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Ngrok error: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        if 'tunnel' in locals():
            ngrok.disconnect(tunnel.url())

if __name__ == "__main__":
    main()
