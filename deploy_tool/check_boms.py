import os
import codecs

ROOT_DIR = r"c:\Users\Vietter\Desktop\cv\dev\vwrt"
TARGET_DIRS = ["cgi-bin", "services", "js", "css", "."]

def check_and_clean():
    processed_files = set()
    for t_dir in TARGET_DIRS:
        full_target = os.path.normpath(os.path.join(ROOT_DIR, t_dir))
        if not os.path.exists(full_target): continue
        
        for root, dirs, files in os.walk(full_target):
            # Don't recurse into dirs already in TARGET_DIRS list to avoid double work
            if t_dir == "." and root != full_target:
                # Only check root files if we are in ".", subdirs will be handled by their own TARGET_DIRS entry
                # or we just let it walk normally but use processed_files
                pass

            for name in files:
                path = os.path.normpath(os.path.join(root, name))
                if path in processed_files: continue
                processed_files.add(path)
                
                # Skip rác và media
                if name.endswith(('.png', '.jpg', '.tar.gz', '.zip', '.git')):
                    continue
                if ".git" in path or "deploy_tool" in path:
                    continue
                
                try:
                    with open(path, 'rb') as f:
                        raw = f.read(3)
                    
                    bom_type = None
                    if raw.startswith(b'\xef\xbb\xbf'):
                        bom_type = "UTF-8 BOM"
                    elif raw.startswith(b'\xff\xfe'):
                        bom_type = "UTF-16 LE"
                    elif raw.startswith(b'\xfe\xff'):
                        bom_type = "UTF-16 BE"
                    
                    if bom_type:
                        print(f"[FOUND {bom_type}] {path}")
                        if bom_type == "UTF-8 BOM":
                            with open(path, 'r', encoding='utf-8-sig') as f:
                                content_str = f.read()
                        elif bom_type == "UTF-16 LE":
                            with open(path, 'r', encoding='utf-16') as f:
                                content_str = f.read()
                        else:
                            with open(path, 'r', encoding='utf-16-be') as f:
                                content_str = f.read()
                        
                        # Normalize line endings
                        content_str = content_str.replace('\r\n', '\n')
                        
                        with open(path, 'wb') as f:
                            f.write(content_str.encode('utf-8'))
                        print(f" -> CLEANED to UTF-8 (LF)")
                    else:
                        # Check for CRLF anyway
                        with open(path, 'rb') as f:
                            raw_content = f.read()
                        
                        if b'\r\n' in raw_content:
                            print(f"[FOUND CRLF] {path}")
                            try:
                                content_str = raw_content.decode('utf-8')
                            except:
                                content_str = raw_content.decode('latin-1')
                            
                            content_str = content_str.replace('\r\n', '\n')
                            with open(path, 'wb') as f:
                                f.write(content_str.encode('utf-8'))
                            print(f" -> CONVERTED to LF")
                            
                except Exception as e:
                    print(f"[ERROR] {path}: {e}")

if __name__ == "__main__":
    check_and_clean()
