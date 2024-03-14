import ModuleBase from './ModuleBase'

class SocialModule extends ModuleBase {
    get isInviteFriendsSupported() {
        return this._platformBridge.isInviteFriendsSupported
    }

    get isJoinCommunitySupported() {
        return this._platformBridge.isJoinCommunitySupported
    }

    get isShareSupported() {
        return this._platformBridge.isShareSupported
    }

    get isCreatePostSupported() {
        return this._platformBridge.isCreatePostSupported
    }

    get isAddToHomeScreenSupported() {
        return this._platformBridge.isAddToHomeScreenSupported
    }

    get isAddToFavoritesSupported() {
        return this._platformBridge.isAddToFavoritesSupported
    }

    get isRateSupported() {
        return this._platformBridge.isRateSupported
    }

    get isExternalLinksAllowed() {
        return this._platformBridge.isExternalLinksAllowed
    }

    inviteFriends(options) {
        if (options) {
            const platformDependedOptions = options[this._platformBridge.platformId]
            if (platformDependedOptions) {
                return this.inviteFriends(platformDependedOptions)
            }
        }

        return this._platformBridge.inviteFriends(options)
    }

    joinCommunity(options) {
        if (options) {
            const platformDependedOptions = options[this._platformBridge.platformId]
            if (platformDependedOptions) {
                return this.joinCommunity(platformDependedOptions)
            }
        }

        return this._platformBridge.joinCommunity(options)
    }

    share(options) {
        if (options) {
            const platformDependedOptions = options[this._platformBridge.platformId]
            if (platformDependedOptions) {
                return this.share(platformDependedOptions)
            }
        }

        return this._platformBridge.share(options)
    }

    createPost(options) {
        if (options) {
            const platformDependedOptions = options[this._platformBridge.platformId]
            if (platformDependedOptions) {
                return this.createPost(platformDependedOptions)
            }
        }

        return this._platformBridge.createPost(options)
    }

    addToHomeScreen() {
        return this._platformBridge.addToHomeScreen()
    }

    addToFavorites() {
        return this._platformBridge.addToFavorites()
    }

    rate() {
        return this._platformBridge.rate()
    }
}

export default SocialModule
