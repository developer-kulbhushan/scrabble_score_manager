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

        # Verify Player Stats Button exists
        expect(page.get_by_text("Player Stats")).to_be_visible()

        page.screenshot(path="verification_home_updated.png")
        print("Home screenshot taken")

        # Go to Player Stats
        print("Navigating to stats...")
        page.click("text=Player Stats")
        page.wait_for_selector("text=Primary Player", timeout=5000)
        page.screenshot(path="verification_stats.png")
        print("Stats screenshot taken")

        # Go Back
        page.click("button:has-text('Back')")

        # Go to New Game
        print("Navigating to game setup...")
        page.click("text=Start New Game")
        page.wait_for_selector("text=New Game", timeout=5000)

        # Verify Default Name (approximate check since it is time based)
        # Just check it is not empty
        expect(page.get_by_placeholder("Game Name")).not_to_be_empty()

        page.screenshot(path="verification_setup_updated.png")
        print("Setup screenshot taken")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run(p)
