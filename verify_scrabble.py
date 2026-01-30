from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        # Go to Home
        print("Navigating to home...")
        page.goto("http://localhost:5173")
        page.wait_for_selector("text=Scrabble Portal", timeout=10000)

        expect(page.get_by_text("Scrabble Portal")).to_be_visible()
        expect(page.get_by_text("Historical Analysis")).to_be_visible()

        page.screenshot(path="verification_home.png")
        print("Home screenshot taken")

        # Open Register Modal
        print("Opening register modal...")
        # Use a more specific selector if possible, or force click
        page.click("text=Register Player")
        page.wait_for_selector("text=Register New Player", timeout=5000)
        page.screenshot(path="verification_register.png")
        print("Register screenshot taken")

        # Close modal
        print("Closing modal...")
        page.get_by_role("button", name="Cancel").click()
        time.sleep(1) # wait for animation

        # Go to New Game
        print("Navigating to game setup...")
        page.click("text=Start New Game")
        page.wait_for_selector("text=New Game", timeout=5000)
        page.screenshot(path="verification_setup.png")
        print("Setup screenshot taken")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run(p)
