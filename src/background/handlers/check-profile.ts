import { Message, Response } from '../../types/messages';
import { isProfileUrl } from '../../content/url-patterns';

export async function handleCheckProfile(
    message: Message,
    sender: chrome.runtime.MessageSender
): Promise<Response> {
    if (message.action !== 'CHECK_PROFILE') {
        return { success: false, error: 'Invalid message action' };
    }

    const tab = sender.tab;
    if (!tab || !tab.url) {
        // If called from popup, we might need to query active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.url) {
            return { success: false, error: 'No active tab found' };
        }

        return {
            success: true,
            data: {
                isProfile: isProfileUrl(activeTab.url),
                url: activeTab.url
            }
        };
    }

    return {
        success: true,
        data: {
            isProfile: isProfileUrl(tab.url),
            url: tab.url
        }
    };
}
