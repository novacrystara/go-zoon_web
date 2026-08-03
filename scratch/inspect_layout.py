from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto('http://localhost:8000/index.html')
    page.wait_for_timeout(2000)
    
    container = page.locator('.customers-visual')
    box = container.bounding_box()
    print(f'Container .customers-visual bounding box: {box}')
    
    # Get the parent customers section box
    sect = page.locator('#customers')
    print(f'Section #customers bounding box: {sect.bounding_box()}')
    
    # Check all images in it
    imgs = container.locator('img').all()
    for idx, img in enumerate(imgs):
        class_name = img.get_attribute('class') or ''
        src = img.get_attribute('src') or ''
        ibox = img.bounding_box()
        style = img.evaluate('el => el.style.cssText')
        comp_style = img.evaluate('''el => {
            const cs = window.getComputedStyle(el);
            return {
                display: cs.display,
                position: cs.position,
                left: cs.left,
                top: cs.top,
                width: cs.width,
                height: cs.height,
                zIndex: cs.zIndex
            };
        }''')
        print(f'Img {idx+1} [class="{class_name}", src="{src}"]:')
        print(f'  Bounding Box: {ibox}')
        print(f'  Inline Style: {style}')
        print(f'  Computed Style: {json.dumps(comp_style, indent=2)}')
    browser.close()
