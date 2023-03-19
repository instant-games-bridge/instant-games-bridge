import PlatformBridgeBase from './PlatformBridgeBase'
import { addJavaScript } from '../common/utils'
import {
    PLATFORM_ID,
    ACTION_NAME,
    INTERSTITIAL_STATE,
    REWARDED_STATE,
    STORAGE_TYPE,
    DEVICE_TYPE,
    BANNER_STATE
} from '../constants'

const SDK_URL = 'https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js'

class VkPlatformBridge extends PlatformBridgeBase {

    // platform
    get platformId() {
        return PLATFORM_ID.VK
    }

    get platformLanguage() {
        let url = new URL(window.location.href)
        if (url.searchParams.has('language')) {
            let language = url.searchParams.get('language')
            try { language = parseInt(language) }
            catch (e) { }

            switch (language) {
                case 0: {
                    return 'ru'
                }
                case 1: {
                    return 'uk'
                }
                case 2: {
                    return 'be'
                }
                case 3: {
                    return 'en'
                }
            }
        }

        return super.platformLanguage
    }

    get platformPayload() {
        let url = new URL(window.location.href)
        if (url.searchParams.has('hash')) {
            return url.searchParams.get('hash')
        }

        return super.platformPayload
    }


    // device
    get deviceType() {
        if (this.#platform) {
            switch (this.#platform) {
                case 'html5_ios':
                case 'html5_android':
                case 'html5_mobile': {
                    return DEVICE_TYPE.MOBILE
                }
                case 'web': {
                    return DEVICE_TYPE.DESKTOP
                }
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
        return this.#platform === 'html5_android'
    }

    get isAddToFavoritesSupported() {
        return true
    }


    // leaderboard
    get isLeaderboardSupported() {
        return true
    }

    get isLeaderboardNativePopupSupported() {
        return this.deviceType === DEVICE_TYPE.MOBILE
    }

    #platform


    initialize() {
        if (this._isInitialized) {
            return Promise.resolve()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INITIALIZE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INITIALIZE)

            let url = new URL(window.location.href)
            if (url.searchParams.has('platform')) {
                this.#platform = url.searchParams.get('platform')
            }

            addJavaScript(SDK_URL).then(() => {
                this._platformSdk = window.vkBridge
                this._platformSdk
                    .send('VKWebAppInit')
                    .then(() => {

                        if (this.#platform === 'html5_android' || this.#platform === 'html5_ios') {
                            this._isBannerSupported = true
                        }

                        this._platformSdk.send('VKWebAppGetUserInfo')
                            .then(data => {
                                if (data) {
                                    this._playerId = data['id']
                                    this._playerName = data['first_name'] + ' ' + data['last_name']

                                    if (data['photo_100']) {
                                        this._playerPhotos.push(data['photo_100'])
                                    }

                                    if (data['photo_200']) {
                                        this._playerPhotos.push(data['photo_200'])
                                    }

                                    if (data['photo_max_orig']) {
                                        this._playerPhotos.push(data['photo_max_orig'])
                                    }
                                }
                            })
                            .finally(() => {
                                this._isInitialized = true
                                this._defaultStorageType = STORAGE_TYPE.PLATFORM_INTERNAL
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


    // storage
    isStorageSupported(storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            return true
        }

        return super.isStorageSupported(storageType)
    }

    getDataFromStorage(key, storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            return new Promise((resolve, reject) => {
                let keys = Array.isArray(key) ? key : [key]

                this._platformSdk
                    .send('VKWebAppStorageGet', { keys })
                    .then(data => {
                        if (Array.isArray(key)) {
                            let values = []

                            for (let i = 0; i < key.length; i++) {
                                if (data.keys[i].value === '') {
                                    values.push(null)
                                    continue
                                }

                                let value
                                try {
                                    value = JSON.parse(data.keys[i].value)
                                } catch (e) {
                                    value = data.keys[i].value
                                }

                                values.push(value)
                            }

                            resolve(values)
                            return
                        }

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
                    .catch(error => {
                        if (error && error.error_data && error.error_data.error_reason) {
                            reject(error.error_data.error_reason)
                        } else {
                            reject()
                        }
                    })
            })
        }

        return super.getDataFromStorage(key, storageType)
    }

    setDataToStorage(key, value, storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            if (Array.isArray(key)) {
                let promises = []

                for (let i = 0; i < key.length; i++) {
                    let data = { key: key[i], value: value[i] }

                    if (typeof value[i] !== 'string') {
                        data.value = JSON.stringify(value[i])
                    }

                    promises.push(this._platformSdk.send('VKWebAppStorageSet', data))
                }

                return Promise.all(promises)
            } else {
                let data = { key, value }

                if (typeof value !== 'string') {
                    data.value = JSON.stringify(value)
                }

                return new Promise((resolve, reject) => {
                    this._platformSdk
                        .send('VKWebAppStorageSet', data)
                        .then(() => {
                            resolve()
                        })
                        .catch(error => {
                            if (error && error.error_data && error.error_data.error_reason) {
                                reject(error.error_data.error_reason)
                            } else {
                                reject()
                            }
                        })
                })
            }
        }

        return super.setDataToStorage(key, value, storageType)
    }

    deleteDataFromStorage(key, storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            if (Array.isArray(key)) {
                let promises = []

                for (let i = 0; i < key.length; i++) {
                    promises.push(this.setDataToStorage(key[i], '', storageType))
                }

                return Promise.all(promises)
            } else {
                return this.setDataToStorage(key, '', storageType)
            }
        }

        return super.deleteDataFromStorage(key, storageType)
    }


    // advertisement
    showBanner(options) {
        let requestOptions = {banner_location: options?.position ?? 'bottom', can_close: false, layout_type: 'resize'};

        this._platformSdk
            .send('VKWebAppShowBannerAd', requestOptions)
            .then(data => {
                if (data.result) {
                    this._setBannerState(BANNER_STATE.SHOWN)
                } else {
                    this._setBannerState(BANNER_STATE.HIDDEN)
                }
            })
            .catch(error => {
                this._setBannerState(BANNER_STATE.FAILED)
            });
    }

    hideBanner() {
        this._platformSdk
            .send('VKWebAppHideBannerAd')
            .then(data => {
                if (!data.result) {
                    this._setBannerState(BANNER_STATE.HIDDEN)
                } else {
                    this._setBannerState(BANNER_STATE.SHOWN)
                }
            }).catch(error => {
                this._setBannerState(BANNER_STATE.FAILED)
            });
    }

    showInterstitial() {
        this._platformSdk
            .send('VKWebAppCheckNativeAds', { ad_format: 'interstitial' })
            .then(data => {
                if (data.result) {
                    this._setInterstitialState(INTERSTITIAL_STATE.OPENED)
                }
            })
            .finally(() => {
                this._platformSdk
                    .send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
                    .then(data => {
                        this._setInterstitialState(data.result ? INTERSTITIAL_STATE.CLOSED : INTERSTITIAL_STATE.FAILED)
                    })
                    .catch(() => {
                        this._setInterstitialState(INTERSTITIAL_STATE.FAILED)
                    })
            })
    }

    showRewarded() {
        this._platformSdk
            .send('VKWebAppCheckNativeAds', { ad_format: 'reward', use_waterfall: true })
            .then(data => {
                if (data.result) {
                    this._setRewardedState(REWARDED_STATE.OPENED)
                }
            })
            .finally(() => {
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
                    .catch(() => {
                        this._setRewardedState(REWARDED_STATE.FAILED)
                    })
            })
    }


    // social
    inviteFriends() {
        return this.#sendRequestToVKBridge(ACTION_NAME.INVITE_FRIENDS, 'VKWebAppShowInviteBox', { }, 'success')
    }

    joinCommunity(options) {
        if (!options || !options.groupId) {
            return Promise.reject()
        }

        let groupId = options.groupId

        if (typeof groupId === 'string') {
            groupId = parseInt(groupId)
            if (isNaN(groupId)) {
                return Promise.reject()
            }
        }

        return this.#sendRequestToVKBridge(ACTION_NAME.JOIN_COMMUNITY, 'VKWebAppJoinGroup', { 'group_id': groupId })
            .then(() => {
                window.open('https://vk.com/public' + groupId)
            })
    }

    share(options) {
        let parameters = { }
        if (options && options.link) {
            parameters.link = options.link
        }

        return this.#sendRequestToVKBridge(ACTION_NAME.SHARE, 'VKWebAppShare', parameters, 'type')
    }

    createPost(options) {
        let parameters = { }
        if (options && options.message) {
            parameters.message = options.message
        }

        if (options && options.attachments) {
            parameters.attachments = options.attachments
        }

        return this.#sendRequestToVKBridge(ACTION_NAME.CREATE_POST, 'VKWebAppShowWallPostBox', parameters, 'post_id')
    }

    addToHomeScreen() {
        if (!this.isAddToHomeScreenSupported) {
            return Promise.reject()
        }

        return this.#sendRequestToVKBridge(ACTION_NAME.ADD_TO_HOME_SCREEN, 'VKWebAppAddToHomeScreen')
    }

    addToFavorites() {
        return this.#sendRequestToVKBridge(ACTION_NAME.ADD_TO_FAVORITES, 'VKWebAppAddToFavorites')
    }


    // leaderboard
    showLeaderboardNativePopup(options) {
        if (!this.isLeaderboardNativePopupSupported) {
            return Promise.reject()
        }

        if (!options || !options.userResult) {
            return Promise.reject()
        }

        let data = { user_result: options.userResult }
        if (typeof options.global === 'boolean') {
            data.global = options.global ? 1 : 0
        }

        return this.#sendRequestToVKBridge(ACTION_NAME.SHOW_LEADERBOARD_NATIVE_POPUP, 'VKWebAppShowLeaderBoardBox', data)
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