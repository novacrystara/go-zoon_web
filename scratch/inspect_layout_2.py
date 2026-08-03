from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto('http://localhost:8000/index.html')
    page.wait_for_timeout(2000)
    
    section = page.locator('#customers')
    print("Section #customers:")
    print(f"  Box: {section.bounding_box()}")
    print(f"  Computed align-items: {section.evaluate('el => window.getComputedStyle(el).alignItems')}")
    print(f"  Computed padding-top: {section.evaluate('el => window.getComputedStyle(el).paddingTop')}")
    
    copy_col = page.locator('#customers .audience-copy')
    print("Copy column:")
    print(f"  Box: {copy_col.bounding_box()}")
    print(f"  Computed margin-top: {copy_col.evaluate('el => window.getComputedStyle(el).marginTop')}")
    
    visual_col = page.locator('#customers .customers-visual')
    print("Visual column:")
    print(f"  Box: {visual_col.bounding_box()}")
    print(f"  Computed margin-top: {visual_col.evaluate('el => window.getComputedStyle(el).marginTop')}")
    
    browser.close()
