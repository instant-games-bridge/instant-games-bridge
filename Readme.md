# Instant Games Bridge
One SDK for cross-platform publishing HTML5 games.

Supported platforms:
+ [VK.COM](https://vk.com)
+ [Yandex Games](https://yandex.com/games/)

Plugins for game engines:
+ [Construct 3](https://github.com/mewtongames/instant-games-bridge-construct)
+ [Unity](https://github.com/mewtongames/instant-games-bridge-unity)
+ [Defold](https://github.com/mewtongames/instant-games-bridge-defold)
+ [Godot](https://github.com/mewtongames/instant-games-bridge-godot)

Roadmap: https://trello.com/b/NjF29vTW.

Join community: https://t.me/instant_games_bridge.

## Usage
+ [Setup](#setup)
+ [Modules Overriding](#modules-overriding)
+ [Platform](#platform)
+ [Device](#device)
+ [Player](#player)
+ [Game](#game)
+ [Advertisement](#advertisement)
+ [Social](#social)
+ [Leaderboard](#leaderboard)

### Setup
First you need to initialize the SDK:
```html
<script src="https://cdn.jsdelivr.net/gh/instant-games-bridge/instant-games-bridge@1.4.6/dist/instant-games-bridge.js"></script>
<script>
    instantGamesBridge.initialize()
        .then(() => {
            // Initialized. You can use other methods.
        })
        .catch(error => {
            // Error
        })
</script>
```

### Modules Overriding
```js
// You can override any module ('advertisement', 'device', 'game', 'player', 'platform', 'social', 'leaderboard').
// Сorrect public interface and return types are required!
class CustomAdvertisementModule {

    initialize(builtinModule) {
        this.builtinModule = builtinModule
    }

    showInterstitial(options) {
        console.log('CustomAdvertisementModule.showInterstitial')
        return new Promise((resolve, reject) => {
            // Custom logic
        })
    }

    showRewarded() {
        console.log('CustomAdvertisementModule.showRewarded')
        // Fallback to builtin module
        return this.builtinModule.showRewarded()
    }

    // ... other methods

}

instantGamesBridge.overrideModule(instantGamesBridge.MODULE_NAME.ADVERTISEMENT, new CustomAdvertisementModule())
```

### Platform
```js
// ID of current platform ('vk', 'yandex', 'mock')
instantGamesBridge.platform.id

// Platform native SDK
instantGamesBridge.platform.sdk

// If platform provides information - this is the user language on platform. 
// If not - this is the language of the user's browser.
instantGamesBridge.platform.language

// The value of the payload parameter from the url. Examples:
// VK: vk.com/app8056947#your-info
// Yandex: yandex.com/games/play/183100?payload=your-info
// Mock: site.com/game?payload=your-info
instantGamesBridge.platform.payload
```

### Device
```js
// 'mobile', 'tablet', 'desktop', 'tv'
instantGamesBridge.device.type
```

### Player
```js
// VK, Yandex: true
instantGamesBridge.player.isAuthorizationSupported

// VK: true, Yandex: true/false
instantGamesBridge.player.isAuthorized

// If player is authorized
instantGamesBridge.player.id

// If player is authorized (Yandex: and allowed access to this information)
instantGamesBridge.player.name
instantGamesBridge.player.photos // Array of player photos, sorted in order of increasing photo size

// If authorization is supported and player is not authorized
let authorizationOptions = {
    yandex: {
        scopes: true // Request access to name and photo
    }
}
instantGamesBridge.player.authorize(authorizationOptions)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })
```

### Game
```js
// Get game data from storage
instantGamesBridge.game.getData(key)
    .then(data => {
        // Data has been received and you can work with them
        // data = null if there is no data for this key
        console.log('Data:', data)
    })
    .catch(error => {
        // Error
    })

// Set game data in storage
instantGamesBridge.game.setData(key, value)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

// Delete game data from storage
instantGamesBridge.game.deleteData(key)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })
```

### Advertisement
```js
/* -- -- -- Delays Between Interstitials -- -- -- */
instantGamesBridge.advertisement.minimumDelayBetweenInterstitial // Default = 60 seconds

// You can override minimum delay. You can use platform specific delays:
let delayOptions = {
    vk: 30,
    yandex: 60,
    mock: 0
}
// Or common to all platforms:
let delayOptions = 60
instantGamesBridge.advertisement.setMinimumDelayBetweenInterstitial(delayOptions)

/* -- -- -- Interstitial -- -- -- */
//  You can use platform specific ignoring:
let interstitialOptions = {
    vk: {
        ignoreDelay: true
    },
    yandex: {
        ignoreDelay: false
    }
}
// Or common to all platforms:
let interstitialOptions = {
    ignoreDelay: true // Default = false
}
// Request to show interstitial ads
instantGamesBridge.advertisement.showInterstitial(interstitialOptions)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

/* -- -- -- Rewarded Video -- -- -- */
// Request to show rewarded video ads
instantGamesBridge.advertisement.showRewarded()
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

/* -- -- -- Advertisement States -- -- -- */
// Fired when interstitial state changed ('opened', 'closed', 'failed')
instantGamesBridge.advertisement.on('interstitial_state_changed', state => console.log('Interstitial state:', state))

// Fired when rewarded video state changed ('opened', 'rewarded', 'closed', 'failed')
// It is recommended to give a reward when the state is 'rewarded'
instantGamesBridge.advertisement.on('rewarded_state_changed', state => console.log('Rewarded state:', state))
```

### Social
```js
// VK: true
// Yandex: false
instantGamesBridge.social.isShareSupported
instantGamesBridge.social.isJoinCommunitySupported
instantGamesBridge.social.isInviteFriendsSupported
instantGamesBridge.social.isCreatePostSupported
instantGamesBridge.social.isAddToFavoritesSupported

// VK, Yandex: partial supported
instantGamesBridge.social.isAddToHomeScreenSupported

// VK: false
// Yandex: true
instantGamesBridge.social.isRateSupported

let shareOptions = {
    vk: {
        link: 'https://vk.com/wordle.game'
    }
}
instantGamesBridge.social.share(shareOptions)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

let joinCommunityOptions = {
    vk: {
        groupId: '199747461'
    }
}
instantGamesBridge.social.joinCommunity(joinCommunityOptions)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

instantGamesBridge.social.inviteFriends()
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

let createPostOptions = {
    vk: {
        message: 'Hello world!',
        attachments: 'photo-199747461_457239629'
    }
}
instantGamesBridge.social.createPost(createPostOptions)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

instantGamesBridge.social.addToHomeScreen()
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

instantGamesBridge.social.addToFavorites()
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

instantGamesBridge.social.rate()
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })
```

### Leaderboard
```js
// VK, Yandex: true
instantGamesBridge.leaderboard.isSupported

// VK: true, Yandex: false
instantGamesBridge.leaderboard.isNativePopupSupported

// VK: false, Yandex: true
instantGamesBridge.leaderboard.isMultipleBoardsSupported
instantGamesBridge.leaderboard.isSetScoreSupported
instantGamesBridge.leaderboard.isGetScoreSupported
instantGamesBridge.leaderboard.isGetEntriesSupported

let setScoreOptions = {
    yandex: {
        leaderboardName: 'YOU_LEADERBOARD_NAME',
        score: 42
    }
}
instantGamesBridge.leaderboard.setScore(setScoreOptions)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })

let getScoreOptions = {
    yandex: {
        leaderboardName: 'YOU_LEADERBOARD_NAME',
    }
}
instantGamesBridge.leaderboard.getScore(getScoreOptions)
    .then(score => {
        // Success
        console.log(score)
    })
    .catch(error => {
        // Error
    })

let getEntriesOptions = {
    yandex: {
        leaderboardName: 'YOU_LEADERBOARD_NAME',
        includeUser: true, // Default = false
        quantityAround: 10, // Default = 5
        quantityTop: 10 // Default = 5
    }
}
instantGamesBridge.leaderboard.getEntries(getEntriesOptions)
    .then(entries => {
        // Success
        entries.forEach(e => {
            console.log('ID: ' + e.id + ', name: ' + e.name + ', score: ' + e.score + ', rank: ' + e.rank + ', small photo: ' + e.photos[0])
        })
    })
    .catch(error => {
        // Error
    })

let showNativePopupOptions = {
    vk: {
        userResult: 42,
        global: true // Default = false
    }
}
instantGamesBridge.leaderboard.showNativePopup(showNativePopupOptions)
    .then(() => {
        // Success
    })
    .catch(error => {
        // Error
    })
```