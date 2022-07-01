import PlatformBridgeBase, {ACTION_NAME} from './PlatformBridgeBase'
import { addJavaScript } from '../common/utils'
import { PLATFORM_ID, INTERSTITIAL_STATE, REWARDED_STATE } from '../constants'

const VK_BRIDGE_URL = 'https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js'

class VkPlatformBridge extends PlatformBridgeBase {

    // platform
    get platformId() {
        return PLATFORM_ID.VK
    }

    get platformLanguage() {
        let url = new URL(window.location.href)
        if (url.searchParams.has('language')) {
            switch (url.searchParams.get('language')) {
                case 0:
                    return 'ru'
                case 1:
                    return 'uk'
                case 2:
                    return 'be'
                case 3:
                    return 'en'
            }
        }

        return super.platformLanguage
    }

    get platformPayload() {
        let url = new URL(window.location.href)
        if (url.searchParams.has('hash'))
            return url.searchParams.get('hash')

        return super.platformPayload
    }


    // device
    get deviceType() {
        let url = new URL(window.location.href)
        if (url.searchParams.has('platform')) {
            let platformType = url.searchParams.get('platform')

            switch (platformType) {
                case 'html5_ios':
                case 'html5_android':
                case 'html5_mobile':
                    return 'mobile'
                case 'web':
                    return 'desktop'
            }
        }

        return super.deviceType
    }


    // player
    get isPlayerAuthorizationSupported() {
        return true
    }

    get isPlayerAuthorized() {
        return true
    }


    // social
    get isInviteFriendsSupported() {
        return true
    }

    get isJoinCommunitySupported() {
        return true
    }

    get isShareSupported() {
        return true
    }

    get isCreatePostSupported() {
        return true
    }

    get isAddToHomeScreenSupported() {
        let url = new URL(window.location.href)
        if (url.searchParams.has('platform')) {
            let platformType = url.searchParams.get('platform')
            if (platformType === 'html5_android')
                return true
        }

        return false
    }

    get isAddToFavoritesSupported() {
        return true
    }


    // leaderboard
    get isLeaderboardSupported() {
        return true
    }

    get isLeaderboardNativePopupSupported() {
        return this.deviceType === 'mobile'
    }


    //payments
    get isPaymentsSupported() {
        return true
    }


    initialize() {
        if (this._isInitialized)
            return Promise.resolve()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INITIALIZE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INITIALIZE)

            addJavaScript(VK_BRIDGE_URL).then(() => {
                this._platformSdk = window.vkBridge

                this._platformSdk
                    .send('VKWebAppInit')
                    .then(() => {

                        this._platformSdk.send('VKWebAppGetUserInfo')
                            .then(data => {
                                if (data) {
                                    this._playerId = data['id']
                                    this._playerName = data['first_name'] + ' ' + data['last_name']

                                    if (data['photo_100'])
                                        this._playerPhotos.push(data['photo_100'])

                                    if (data['photo_200'])
                                        this._playerPhotos.push(data['photo_200'])

                                    if (data['photo_max_orig'])
                                        this._playerPhotos.push(data['photo_max_orig'])
                                }
                            })
                            .finally(() => {
                                this._isInitialized = true
                                this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)
                            })

                    })
            })
        }

        return promiseDecorator.promise
    }


    // player
    authorizePlayer(options) {
        return Promise.resolve()
    }


    // game
    getGameData(key) {
        return new Promise(resolve => {
            this._platformSdk
                .send('VKWebAppStorageGet', { 'keys': [key] })
                .then(data => {
                    if (data.keys[0].value === '') {
                        resolve(null)
                        return
                    }

                    let value
                    try {
                        value = JSON.parse(data.keys[0].value)
                    } catch (e) {
                        value = data.keys[0].value
                    }

                    resolve(value)
                })
                .catch(() => {
                    resolve(null)
                })
        })
    }

    setGameData(key, value) {
        return new Promise((resolve, reject) => {
            let data = { key, value }

            if (typeof value !== 'string')
                data.value = JSON.stringify(value)

            this._platformSdk
                .send('VKWebAppStorageSet', data)
                .then(() => {
                    resolve()
                })
                .catch(error => {
                    if (error && error.error_data && error.error_data.error_reason)
                        reject(error.error_data.error_reason)
                    else
                        reject()
                })
        })
    }

    deleteGameData(key) {
        return this.setGameData(key, '')
    }


    // advertisement
    showInterstitial() {
        if (!this._canShowAdvertisement())
            return Promise.reject()

        return this.#sendRequestToVKBridge(ACTION_NAME.SHOW_INTERSTITIAL, 'VKWebAppCheckNativeAds', { ad_format: 'interstitial' })
            .then(() => {

                this._setInterstitialState(INTERSTITIAL_STATE.OPENED)

                this._platformSdk
                    .send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
                    .then(data => {
                        this._setInterstitialState(data.result ? INTERSTITIAL_STATE.CLOSED : INTERSTITIAL_STATE.FAILED)
                    })
                    .catch(error => {
                        this._setInterstitialState(INTERSTITIAL_STATE.FAILED)
                    })

            })
    }

    showRewarded() {
        if (!this._canShowAdvertisement())
            return Promise.reject()

        return this.#sendRequestToVKBridge(ACTION_NAME.SHOW_REWARDED, 'VKWebAppCheckNativeAds', { ad_format: 'reward', use_waterfall: true })
            .then(() => {

                this._setRewardedState(REWARDED_STATE.OPENED)

                this._platformSdk
                    .send('VKWebAppShowNativeAds', { ad_format: 'reward', use_waterfall: true })
                    .then(data => {
                        if (data.result) {
                            this._setRewardedState(REWARDED_STATE.REWARDED)
                            this._setRewardedState(REWARDED_STATE.CLOSED)
                        } else {
                            this._setRewardedState(REWARDED_STATE.FAILED)
                        }
                    })
                    .catch(error => {
                        this._setRewardedState(REWARDED_STATE.FAILED)
                    })

            })
    }


    // social
    inviteFriends() {
        return this.#sendRequestToVKBridge(ACTION_NAME.INVITE_FRIENDS, 'VKWebAppShowInviteBox', { }, 'success')
    }

    joinCommunity(options) {
        if (!options || !options.groupId)
            return Promise.reject()

        let groupId = options.groupId

        if (typeof groupId === 'string') {
            groupId = parseInt(groupId)
            if (isNaN(groupId))
                return Promise.reject()
        }

        return this.#sendRequestToVKBridge(ACTION_NAME.JOIN_COMMUNITY, 'VKWebAppJoinGroup', { 'group_id': groupId })
            .then(() => {
                window.open('https://vk.com/public' + groupId)
            })
    }

    share(options) {
        let parameters = { }
        if (options && options.link)
            parameters.link = options.link

        return this.#sendRequestToVKBridge(ACTION_NAME.SHARE, 'VKWebAppShare', parameters, 'type')
    }

    createPost(options) {
        let parameters = { }
        if (options && options.message)
            parameters.message = options.message

        if (options && options.attachments)
            parameters.attachments = options.attachments

        return this.#sendRequestToVKBridge(ACTION_NAME.CREATE_POST, 'VKWebAppShowWallPostBox', parameters, 'post_id')
    }

    addToHomeScreen() {
        if (!this.isAddToHomeScreenSupported)
            return Promise.reject()

        return this.#sendRequestToVKBridge(ACTION_NAME.ADD_TO_HOME_SCREEN, 'VKWebAppAddToHomeScreen')
    }

    addToFavorites() {
        return this.#sendRequestToVKBridge(ACTION_NAME.ADD_TO_FAVORITES, 'VKWebAppAddToFavorites')
    }


    // leaderboard
    showLeaderboardNativePopup(options) {
        if (!this.isLeaderboardNativePopupSupported)
            return Promise.reject()

        if (!options || !options.userResult)
            return Promise.reject()

        let data = { user_result: options.userResult }
        if (typeof options.global === 'boolean')
            data.global = options.global ? 1 : 0

        return this.#sendRequestToVKBridge(ACTION_NAME.SHOW_LEADERBOARD_NATIVE_POPUP, 'VKWebAppShowLeaderBoardBox', data)
    }


    //payments
    showOrderPayments(title) {
        return new Promise(resolve => {
            this._platformSdk
                .send("VKWebAppShowOrderBox", {type: 'item', item: title})
                .then(data => {
                    if (data['success']) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                }).catch(() =>{
                    resolve(false)
                })
        })
    }


    #sendRequestToVKBridge(actionName, vkMethodName, parameters = { }, responseSuccessKey = 'result') {
        let promiseDecorator = this._getPromiseDecorator(actionName)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(actionName)

            this._platformSdk
                .send(vkMethodName, parameters)
                .then(data => {
                    if (data[responseSuccessKey]) {
                        this._resolvePromiseDecorator(actionName)
                        return
                    }

                    this._rejectPromiseDecorator(actionName)
                })
                .catch(error => {
                    this._rejectPromiseDecorator(actionName, error)
                })
        }

        return promiseDecorator.promise
    }

}

export default VkPlatformBridge