document.addEventListener('DOMContentLoaded', () => {
    // Get the reload button
    const reloadButton = document.getElementById('reloadChat');

    // Add click event listener
    reloadButton.addEventListener('click', async () => {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Reload the tab
        await chrome.tabs.reload(tab.id);

        // Close the popup
        window.close();
    });
}); 