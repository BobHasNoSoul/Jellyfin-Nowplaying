const config = {
    showUserNames: true, // Set to false to hide usernames in the overlay
    nowPlayingUrl: '/web/custom-now-playing-secure.json' // Path to static JSON file
};

let playButton = null;
let overlay = null;

function createPlayButton(castButton) {
    if (playButton) {
        playButton.remove();
    }

    playButton = document.createElement('button');
    playButton.setAttribute('is', 'paper-icon-button-light');
    playButton.className = 'headerNowPlayingButton headerButton headerButtonRight paper-icon-button-light';
    playButton.title = 'Now Playing';
    playButton.innerHTML = '<span class="material-icons play_arrow" aria-hidden="true"></span>';
    playButton.style.backgroundColor = '#00ff00'; // Green background
    const castWidth = parseFloat(getComputedStyle(castButton).width);
    const castHeight = parseFloat(getComputedStyle(castButton).height);
    playButton.style.width = `${castWidth * 1.2}px`; // 20% larger
    playButton.style.height = `${castHeight * 1.2}px`; // 20% larger

    castButton.parentNode.insertBefore(playButton, castButton);

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            color: white;
            padding: 20px;
            overflow-y: auto;
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    }

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
        const response = await fetch(config.nowPlayingUrl);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const sessions = await response.json();
        
        overlay.innerHTML = '<h2>Currently Playing</h2>';
        const list = document.createElement('ul');
        list.style.cssText = 'list-style: none; padding: 0;';
        
        for (const session of sessions) {
            if (session.NowPlayingItem) {
                const item = session.NowPlayingItem;
                const li = document.createElement('li');
                li.style.cssText = 'margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;';
                
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

                        if (isEpisode) {

                            if (itemData.ImageTags && itemData.ImageTags.Logo) {
                                logoUrl = `/Items/${item.Id}/Images/Logo?api_key=${accessToken}`;
                            }
                            else if (seasonId) {
                                const seasonResponse = await fetch(`/Items/${seasonId}?api_key=${accessToken}`);
                                const seasonData = await seasonResponse.json();
                                if (seasonData.ImageTags && seasonData.ImageTags.Logo) {
                                    logoUrl = `/Items/${seasonId}/Images/Logo?api_key=${accessToken}`;
                                }
                            }
                            if (!logoUrl && seriesId) {
                                const seriesResponse = await fetch(`/Items/${seriesId}?api_key=${accessToken}`);
                                const seriesData = await seriesResponse.json();
                                if (seriesData.ImageTags && seriesData.ImageTags.Logo) {
                                    logoUrl = `/Items/${seriesId}/Images/Logo?api_key=${accessToken}`;
                                }
                            }
                        } else if (itemData.ImageTags && itemData.ImageTags.Logo) {
                            logoUrl = `/Items/${item.Id}/Images/Logo?api_key=${accessToken}`;
                        }
                    } catch (e) {
                        console.error('Error fetching item details:', e);
                    }
                }

                const link = document.createElement('a');
                link.href = `/web/index.html#!/details?id=${item.Id}`;
                link.style.cssText = 'display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: inherit; width: 100%;';
                link.addEventListener('click', () => {
                    overlay.style.display = 'none'; // Close overlay on link click
                });

                let logo = null;
                if (logoUrl) {
                    logo = document.createElement('img');
                    logo.src = logoUrl;
                    logo.alt = `${item.Name} logo`;
                    logo.style.cssText = 'height: 10vh; width: auto; margin-right: 10px;';
                }

                const content = document.createElement('div');
                content.style.cssText = 'flex: 1; text-align: center;';

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

                const description = document.createElement('p');
                description.textContent = overview.length > 150 ? overview.substring(0, 147) + '...' : overview;
                description.style.cssText = 'margin: 5px 0 0 0; color: #ccc;';

                if (config.showUserNames) {
                    const user = document.createElement('p');
                    user.textContent = `Playing for: ${session.UserName || 'Unknown User'}`;
                    user.style.cssText = 'margin: 5px 0 0 0; font-style: italic;';
                    content.appendChild(user);
                }

                content.appendChild(title);
                content.appendChild(description);

                const thumbnail = document.createElement('img');
                thumbnail.src = thumbnailUrl || '/web/assets/img/banner-light.png';
                thumbnail.alt = `${item.Name} thumbnail`;
                thumbnail.style.cssText = 'height: 39vh; width: auto; margin-left: 10px;';

                if (logo) {
                    link.appendChild(logo);
                }
                link.appendChild(content);
                link.appendChild(thumbnail);
                li.appendChild(link);
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
        overlay.style.display = 'block';
    }
}

function scanForCastButton() {
    const castButton = document.querySelector('.headerCastButton');
    if (castButton && castButton.offsetParent !== null) { 
        createPlayButton(castButton);
        return true;
    }
    return false;
}

function startScanning() {
    const interval = setInterval(() => {
        if (scanForCastButton()) {
            clearInterval(interval); 
        }
    }, 1000); // Check every 1 second
}

startScanning();

function setupHomeButtonListener() {
    const homeButton = document.querySelector('.headerHomeButton');
    if (homeButton) {
        homeButton.addEventListener('click', () => {
            setTimeout(startScanning, 500);
        });
    } else {
        setTimeout(setupHomeButtonListener, 1000);
    }
}

setupHomeButtonListener();
