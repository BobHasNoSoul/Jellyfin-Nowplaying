const config = {
    showUserNames: false, // Set to false to hide usernames in the overlay
    nowPlayingUrl: '/web/custom-now-playing-secure.json' // Path to static JSON file
};

let playButton = null;
let overlay = null;

function createPlayButton(castButton) {
    // Remove existing play button if it exists
    if (playButton) {
        playButton.remove();
    }

    // Create the play button
    playButton = document.createElement('button');
    playButton.setAttribute('is', 'paper-icon-button-light');
    playButton.className = 'headerNowPlayingButton headerButton headerButtonRight paper-icon-button-light';
    playButton.title = 'Now Playing';
    playButton.innerHTML = '<span class="material-icons play_arrow" aria-hidden="true"></span>';
    playButton.style.backgroundColor = '#00ff0000'; // Green background
    const castWidth = parseFloat(getComputedStyle(castButton).width);
    const castHeight = parseFloat(getComputedStyle(castButton).height);
    playButton.style.width = `${castWidth * 1.2}px`; // 20% larger
    playButton.style.height = `${castHeight * 1.2}px`; // 20% larger

    // Insert play button to the left of cast button
    castButton.parentNode.insertBefore(playButton, castButton);

    // Create or update overlay
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 5px;
            left: 5px;
            width: calc(100% - 10px);
            height: calc(100% - 10px);
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            color: white;
            padding: 20px;
            overflow-y: auto;
            border: 5px solid #333;
            box-sizing: border-box;
        `;
        document.body.appendChild(overlay);

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '<span class="material-icons">close</span>';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        `;
        closeButton.addEventListener('click', () => {
            overlay.style.display = 'none';
        });
        overlay.appendChild(closeButton);

        // Close overlay when clicking outside content
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    }

    // Add click event to play button
    playButton.addEventListener('click', showNowPlaying);
}

function getAccessToken() {
    try {
        const credentials = JSON.parse(localStorage.getItem('jellyfin_credentials'));
        if (credentials && credentials.Servers && credentials.Servers.length > 0) {
            return credentials.Servers[0].AccessToken;
        }
        return null;
    } catch (e) {
        console.error('Error retrieving Jellyfin credentials', e);
        return null;
    }
}

async function showNowPlaying() {
    const accessToken = getAccessToken();
    if (!accessToken) {
        overlay.innerHTML = '<h2>Error</h2><p>No access token found. Please log in to Jellyfin.</p>';
        overlay.style.display = 'block';
        return;
    }

    try {
        // Fetch sessions from static JSON file
        const response = await fetch(config.nowPlayingUrl);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const sessions = await response.json();

        // Clear overlay content but keep close button
        overlay.innerHTML = '<h2>Currently Playing</h2>';
        const closeButton = overlay.querySelector('button');
        if (closeButton) {
            overlay.appendChild(closeButton); // Re-attach close button
        }

        const list = document.createElement('ul');
        list.style.cssText = 'list-style: none; padding: 0;';

        for (const session of sessions) {
            if (session.NowPlayingItem) {
                const item = session.NowPlayingItem;
                const li = document.createElement('li');
                li.style.cssText = 'margin-bottom: 20px;';

                // Create card container
                const card = document.createElement('div');
                card.className = 'item-card';
                card.style.cssText = `
                    background: #222;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                `;

                // Fetch item details for thumbnail, overview, and logo
                let thumbnailUrl = '';
                let logoUrl = '';
                let overview = item.Overview || 'No description available';
                let seriesName = item.SeriesName || '';
                let seasonNumber = item.SeasonNumber || '';
                let episodeNumber = item.EpisodeNumber || '';
                let isEpisode = item.Type === 'Episode';
                let seasonId = '';
                let seriesId = '';

                if (item.Id) {
                    try {
                        const itemResponse = await fetch(`/Items/${item.Id}?api_key=${accessToken}`);
                        const itemData = await itemResponse.json();
                        if (itemData.ImageTags && itemData.ImageTags.Primary) {
                            thumbnailUrl = `/Items/${item.Id}/Images/Primary?api_key=${accessToken}`;
                        }
                        overview = itemData.Overview || overview;
                        seriesName = itemData.SeriesName || seriesName;
                        seasonNumber = itemData.SeasonNumber || seasonNumber;
                        episodeNumber = itemData.EpisodeNumber || episodeNumber;
                        seasonId = itemData.SeasonId || '';
                        seriesId = itemData.SeriesId || '';

                        // Logo logic
                        if (isEpisode) {
                            // Try episode logo
                            if (itemData.ImageTags && itemData.ImageTags.Logo) {
                                logoUrl = `/Items/${item.Id}/Images/Logo?api_key=${accessToken}`;
                            }
                            // Try season logo
                            else if (seasonId) {
                                const seasonResponse = await fetch(`/Items/${seasonId}?api_key=${accessToken}`);
                                const seasonData = await seasonResponse.json();
                                if (seasonData.ImageTags && seasonData.ImageTags.Logo) {
                                    logoUrl = `/Items/${seasonId}/Images/Logo?api_key=${accessToken}`;
                                }
                            }
                            // Try series logo
                            if (!logoUrl && seriesId) {
                                const seriesResponse = await fetch(`/Items/${seriesId}?api_key=${accessToken}`);
                                const seriesData = await seriesResponse.json();
                                if (seriesData.ImageTags && seriesData.ImageTags.Logo) {
                                    logoUrl = `/Items/${seriesId}/Images/Logo?api_key=${accessToken}`;
                                }
                            }
                        } else if (itemData.ImageTags && itemData.ImageTags.Logo) {
                            // Non-episode (e.g., movie) logo
                            logoUrl = `/Items/${item.Id}/Images/Logo?api_key=${accessToken}`;
                        }
                    } catch (e) {
                        console.error('Error fetching item details:', e);
                    }
                }

                // Create link wrapper for entire card
                const link = document.createElement('a');
                link.href = `/web/index.html#!/details?id=${item.Id}`;
                link.style.cssText = 'display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: inherit; width: 100%;';
                link.addEventListener('click', () => {
                    overlay.style.display = 'none'; // Close overlay on link click
                });

                // Create logo container
                const logoContainer = document.createElement('div');
                logoContainer.className = 'item-logo';
                if (logoUrl) {
                    const logo = document.createElement('img');
                    logo.src = logoUrl;
                    logo.alt = `${item.Name} logo`;
                    logo.style.cssText = 'height: 10vh; width: auto; margin-right: 10px;';
                    logoContainer.appendChild(logo);
                }

                // Create content container
                const contentContainer = document.createElement('div');
                contentContainer.className = 'item-content';
                contentContainer.style.cssText = 'flex: 1; text-align: center;';

                // Title structure
                const title = document.createElement('div');
                if (isEpisode && seriesName) {
                    const showTitle = document.createElement('p');
                    showTitle.textContent = seriesName;
                    showTitle.style.cssText = 'margin: 0; color: #00ff00; font-size: 1.2em;';
                    title.appendChild(showTitle);

                    if (seasonNumber && episodeNumber) {
                        const seasonEpisode = document.createElement('p');
                        seasonEpisode.textContent = `S${seasonNumber} E${episodeNumber}`;
                        seasonEpisode.style.cssText = 'margin: 2px 0; color: #ccc; font-size: 1em;';
                        title.appendChild(seasonEpisode);
                    }

                    const episodeTitle = document.createElement('p');
                    episodeTitle.textContent = item.Name;
                    episodeTitle.style.cssText = 'margin: 2px 0; color: #fff; font-size: 1em;';
                    title.appendChild(episodeTitle);
                } else {
                    const movieTitle = document.createElement('p');
                    movieTitle.textContent = item.Name;
                    movieTitle.style.cssText = 'margin: 0; color: #00ff00; font-size: 1.2em;';
                    title.appendChild(movieTitle);
                }

                // Create plot container
                const plotContainer = document.createElement('div');
                plotContainer.className = 'item-plot';
                const description = document.createElement('p');
                description.textContent = overview.length > 150 ? overview.substring(0, 147) + '...' : overview;
                description.style.cssText = 'margin: 5px 0 0 0; color: #ccc;';
                plotContainer.appendChild(description);

                // Add username if enabled
                if (config.showUserNames) {
                    const user = document.createElement('p');
                    user.textContent = `Playing for: ${session.UserName || 'Unknown User'}`;
                    user.style.cssText = 'margin: 5px 0 0 0; font-style: italic;';
                    contentContainer.appendChild(user);
                }

                contentContainer.appendChild(title);
                contentContainer.appendChild(plotContainer);

                // Create thumbnail container
                const thumbnailContainer = document.createElement('div');
                thumbnailContainer.className = 'item-thumbnail';
                const thumbnail = document.createElement('img');
                thumbnail.src = thumbnailUrl || '/web/assets/img/banner-light.png';
                thumbnail.alt = `${item.Name} thumbnail`;
                thumbnail.style.cssText = 'height: 39vh; width: auto; margin-left: 10px;';
                thumbnailContainer.appendChild(thumbnail);

                // Assemble card: logo > content > thumbnail
                link.appendChild(logoContainer);
                link.appendChild(contentContainer);
                link.appendChild(thumbnailContainer);
                card.appendChild(link);
                li.appendChild(card);
                list.appendChild(li);
            }
        }

        if (list.children.length === 0) {
            list.innerHTML = '<li>No items are currently playing</li>';
        }

        overlay.appendChild(list);
        overlay.style.display = 'block';
    } catch (error) {
        console.error('Error fetching sessions:', error);
        overlay.innerHTML = '<h2>Error</h2><p>Could not load currently playing information</p>';
        const closeButton = overlay.querySelector('button');
        if (closeButton) {
            overlay.appendChild(closeButton); // Re-attach close button
        }
        overlay.style.display = 'block';
    }
}

function scanForCastButton() {
    const castButton = document.querySelector('.headerCastButton');
    if (castButton && castButton.offsetParent !== null) { // Check if visible
        createPlayButton(castButton);
        return true;
    }
    return false;
}

function startScanning() {
    const interval = setInterval(() => {
        if (scanForCastButton()) {
            clearInterval(interval); // Stop scanning once button is found
        }
    }, 1000); // Check every 1 second
}

// Initial scan
startScanning();

// Listen for home button clicks to re-run scan
function setupHomeButtonListener() {
    const homeButton = document.querySelector('.headerHomeButton');
    if (homeButton) {
        homeButton.addEventListener('click', () => {
            // Delay to allow DOM to update after navigation
            setTimeout(startScanning, 500);
        });
    } else {
        // Retry if home button not found
        setTimeout(setupHomeButtonListener, 1000);
    }
}

setupHomeButtonListener();
