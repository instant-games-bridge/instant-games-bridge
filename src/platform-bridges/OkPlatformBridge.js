import PlatformBridgeBase from './PlatformBridgeBase'
import { addJavaScript } from '../common/utils'
import {
    PLATFORM_ID,
    ACTION_NAME, STORAGE_TYPE,
    ERROR, REWARDED_STATE, INTERSTITIAL_STATE, BANNER_STATE,
} from '../constants'

const SDK_URL = '//api.ok.ru/js/fapi5.js'
const AUTH_STATE = 'AUTHORIZED'

const PERMISSION_TYPES = {
    VALUABLE_ACCESS: 'VALUABLE_ACCESS',
    PHOTO_CONTENT: 'PHOTO_CONTENT',
}

class OkPlatformBridge extends PlatformBridgeBase {
    // platform
    get platformId() {
        return PLATFORM_ID.OK
    }

    // player
    get isPlayerAuthorizationSupported() {
        return true
    }

    // clipboard
    get isClipboardSupported() {
        return false
    }

    // social

    get isInviteFriendsSupported() {
        return true
    }

    get isCreatePostSupported() {
        return true
    }

    get isRateSupported() {
        return true
    }

    _hasValuableAccessPermission = false

    _platformStorageCachedData = {}

    _platformStoragePromises = []

    _platformBannerOptions = {}

    initialize() {
        if (this._isInitialized) {
            return Promise.resolve()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INITIALIZE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INITIALIZE)

            addJavaScript(SDK_URL)
                .then(() => {
                    this._platformSdk = window.FAPI
                    window.API_callback = (method, result, data) => this.#apiCallbacks[method](result, data)
                    const params = this._platformSdk.Util.getRequestParameters() || {}
                    if (!params.api_server || !params.apiconnection) {
                        this._rejectPromiseDecorator(ACTION_NAME.INITIALIZE, ERROR.OK_GAME_PARAMS_NOT_FOUND)
                    }
                    this._platformSdk.init(
                        params.api_server,
                        params.apiconnection,
                        () => {
                            const savedState = this._platformSdk?.saved_state
                            this._isPlayerAuthorized = savedState ? savedState === AUTH_STATE : true
                            if (this._isPlayerAuthorized) {
                                this._platformSdk.Client.call(this.#fields.userProfile, this.#callbacks.userProfileCallback)
                                this._platformSdk.Client.call(this.#fields.hasAppPermission(PERMISSION_TYPES.VALUABLE_ACCESS), this.#callbacks.hasValueAccessCallback)
                            } else {
                                this._isInitialized = true
                                this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)
                            }
                        },
                    )
                })
        }

        return promiseDecorator.promise
    }

    // player
    authorizePlayer() {
        if (this._isPlayerAuthorized) {
            return Promise.resolve()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
            this._platformSdk.UI.showLoginSuggestion(AUTH_STATE)
        }

        return promiseDecorator.promise.then(() => {
            this._isPlayerAuthorized = true
        })
            .catch(() => {
                this._isPlayerAuthorized = false
            })
    }

    // storage

    isStorageSupported(storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            return true
        }

        return super.isStorageSupported(storageType)
    }

    isStorageAvailable(storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            return this._hasValuableAccessPermission
        }

        return super.isStorageSupported(storageType)
    }

    getDataFromStorage(key, storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            if (!this._hasValuableAccessPermission) {
                return Promise.reject(ERROR.STORAGE_NOT_SUPPORTED)
            }
            if (typeof this._platformStorageCachedData[key] === 'undefined') {
                this._platformSdk.Client.call(this.#fields.getStorageValue(key), this.#callbacks.getStrorageValueCallBack)
            }
            return new Promise((resolve) => {
                resolve(this._platformStorageCachedData[key])
            })
        }

        return super.getDataFromStorage(key, storageType)
    }

    setDataToStorage(key, value, storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            if (!this._hasValuableAccessPermission) {
                return Promise.reject(ERROR.STORAGE_NOT_SUPPORTED)
            }
            return this.#aggregateStorageMethods(key, value)
        }

        return super.setDataToStorage(key, value, storageType)
    }

    deleteDataFromStorage(key, storageType) {
        if (storageType === STORAGE_TYPE.PLATFORM_INTERNAL) {
            if (!this._hasValuableAccessPermission) {
                return Promise.reject(ERROR.STORAGE_NOT_SUPPORTED)
            }

            return this.#aggregateStorageMethods(key)
        }

        return super.deleteDataFromStorage(key, storageType)
    }

    // advertisement
    showInterstitial() {
        try {
            this._platformSdk.UI.showAd()
        } catch {
            this._setInterstitialState(INTERSTITIAL_STATE.FAILED)
        }
    }

    showRewarded() {
        try {
            this._platformSdk.UI.loadAd()
            this._setRewardedState(REWARDED_STATE.OPENED)
        } catch {
            this._setRewardedState(REWARDED_STATE.FAILED)
        }
    }

    showBanner(options) {
        const position = 'bottom'
        if (options) {
            if (typeof options.layoutType === 'string') {
                this._platformBannerOptions = {
                    ...options,
                    layoutType: null,
                }
                this._platformSdk.invokeUIMethod('setBannerFormat', options.layoutType)
                return
            }
            if (typeof options.position === 'string') {
                this._platformSdk.invokeUIMethod('requestBannerAds', options.position)
                return
            }
        }
        this._platformSdk.invokeUIMethod('requestBannerAds', position)
    }

    hideBanner() {
        this._platformSdkAPI.invokeUIMethod('hideBannerAds')
    }

    purchase() {
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.PURCHASE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.PURCHASE)
            this._platformSdk.UI.showPortalPayment()
        }

        return promiseDecorator.promise
    }

    consumePurchase(options) {
        const {
            name,
            description,
            code,
            price,
        } = options || {}
        if (!options || [name, description, code, price].includes(undefined)) {
            return Promise.reject()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.CONSUME_PURCHASE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.CONSUME_PURCHASE)
            this._platformSdk.UI.showPayment(name, description, code, price, null, null, 'ok', true)
        }
        return promiseDecorator.promise
    }

    inviteFriends(options) {
        const {
            text,
        } = options || {}
        if (!options || typeof text !== 'string') {
            return Promise.reject()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INVITE_FRIENDS)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INVITE_FRIENDS)
            if (text.length > 120) {
                this._rejectPromiseDecorator(ACTION_NAME.INVITE_FRIENDS, ERROR.INVITE_FRIENDS_MESSAGE_LENGTH_ERROR)
            }

            this._platformSdk.UI.showInvite(text)
        }
        return promiseDecorator.promise
    }

    rate() {
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.RATE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.RATE)
            this._platformSdk.UI.showRatingDialog()
        }

        return promiseDecorator.promise
    }

    createPost(options) {
        if (!options || !options?.attachment) {
            return Promise.reject()
        }
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.CREATE_POST)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.CREATE_POST)
            this._platformSdk.UI.postMediatopic(options, options.status ?? false)
        }

        return promiseDecorator.promise
    }

    joinCommunity(options) {
        if (!options || !options?.groupId) {
            return Promise.reject()
        }
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.JOIN_COMMUNITY)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.JOIN_COMMUNITY)
            this._platformSdk.UI.joinGroup(options.groupId, options.enableMessages ?? false)
        }

        return promiseDecorator.promise
    }

    #aggregateStorageMethods(key, value) {
        const cachedData = {}
        const keys = []
        const values = []
        if (!Array.isArray(key)) {
            keys.push(key)
            values.push(value ?? null)
        }
        if (Array.isArray(key)) {
            const valueList = !value.length ? Array(key.length)
                .fill(null) : value
            keys.concat(key)
            values.concat(valueList)
        }
        for (let i = 0; i < keys.length; i++) {
            const data = {
                key: keys[i],
                value: values[i],
            }

            if (typeof values[i] !== 'string' && values[i] !== null && values[i] !== undefined) {
                data.value = JSON.stringify(values[i])
            }
            cachedData[data.key] = data.value
            this._platformSdk.Client.call(this.#fields.setStorageValue(data.key, data.value), this.#callbacks.setValueStorageCalBack)
        }

        return Promise.all(this._platformStoragePromises)
            .then(() => {
                this._platformStorageCachedData = { ...this._platformStorageCachedData, ...cachedData }
            })
            .finally(() => {
                this._platformStoragePromises = []
            })
    }

    get #fields() {
        return {
            userProfile: {
                fields: 'uid,name,pic50x50,pic128x128,pic_base',
                method: 'users.getCurrentUser',
            },
            hasAppPermission: (permission) => ({
                method: 'users.hasAppPermission',
                ext_perm: permission,
            }),
            getStorageValue: (key) => ({
                method: 'storage.get',
                fields: key,
                keys: [key],
            }),
            setStorageValue: (key, value) => ({
                method: 'storage.set',
                key,
                value,
            }),
        }
    }

    get #callbacks() {
        return {
            userProfileCallback: (status, data, error) => this.#onGetUserProfileCompleted(status, data, error),
            hasValueAccessCallback: (_, result, data) => this.#onHasAccessValuePermissionCompleted(result, data),
            getStrorageValueCallBack: (status, data, error) => this.#onGetValueCompleted(status, data, error),
            setValueStorageCalBack: (status, _, error) => this.#onSetValueCompleted(status, error),
        }
    }

    get #apiCallbacks() {
        return {
            showPermissions: (result, data) => this.#onSetStatusPermissionCompleted(result, data),
            loadAd: (result) => this.#onLoadedRewarded(result),
            showLoadedAd: (_, data) => this.#onRewardedShown(data),
            showAd: (_, data) => this.#onInterstitialShown(data),
            requestBannerAds: (result, data) => this.#onRequestedBanner(result, data),
            showBannerAds: (_, data) => this.#onShownBanner(data),
            hideBannerAds: (_, data) => this.#onHiddenBanner(data),
            setBannerFormat: (result) => this.#onSetBannerFormat(result),
            showPayment: (result) => this.#onPurchaseConsumeCompleted(result),
            inviteFriends: (result) => this.#onInviteFriendsCompleted(result),
            showRatingDialog: (result, data) => this.#onGameRatingRecieved(result, data),
            createPost: (result) => this.#onPostCreated(result),
            joinGroup: (result, data) => this.#onJoinGroupRequested(result, data),
            showLoginSuggestion: (result, data) => this.#onLoginCompleted(result, data),
            postMediatopic: (result, data) => this.#onPostCreatedCompleted(result, data),
        }
    }

    #onGetUserProfileCompleted(status, data) {
        if (status === 'ok') {
            this._playerId = data.uid
            this._playerName = data.name
            this._playerPhotos = [data.pic50x50, data.pic128x128, data.pic_base]
        }
        this._isInitialized = true
        this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)
    }

    #onLoginCompleted(result, data) {
        if (result === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER, data)
            return
        }
        this._resolvePromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
    }

    #onHasAccessValuePermissionCompleted(result) {
        this._hasValuableAccessPermission = !!result
        if (!this._hasValuableAccessPermission) {
            const permissions = Object.values(PERMISSION_TYPES)
                .map((value) => `"${value}"`)
                .join(',')
            this._platformSdk.UI.showPermissions(`[${permissions}]`)
        }
    }

    #onSetStatusPermissionCompleted(result) {
        this._hasValuableAccessPermission = !!result
    }

    // storage
    #onGetValueCompleted(status, data, error) {
        return new Promise((resolve, reject) => {
            if (status === 'error' || !data.data) {
                reject(error)
            }
            const [key, value] = Object.entries(data.data)[0]
            const parsedValue = value ? JSON.parse(value) : value
            this._platformStorageCachedData[key] = parsedValue
            resolve(parsedValue)
        })
    }

    #onSetValueCompleted(status, error) {
        const promise = new Promise((resolve, reject) => {
            if (status === 'error') {
                reject(error)
            }
            resolve()
        })
        this._platformStoragePromises.push(promise)
    }

    #onLoadedRewarded(result) {
        if (result === 'error') {
            this._setRewardedState(REWARDED_STATE.FAILED)
        } else {
            this._platformSdk.UI.showLoadedAd()
        }
    }

    #onRewardedShown(data) {
        switch (data) {
            case 'ad_shown':
                this._setRewardedState(REWARDED_STATE.REWARDED)
                this._setRewardedState(REWARDED_STATE.CLOSED)
                break
            case 'skip':
                this._setRewardedState(REWARDED_STATE.CLOSED)
                break
            case 'not_prepared':
            case 'mp4_not_supported':
            case 'app_in_fullscreen':
            default:
                this._setRewardedState(REWARDED_STATE.FAILED)
                break
        }
    }

    #onInterstitialShown(data) {
        switch (data) {
            case 'ready':
                break
            case 'ad_prepared':
                this._setInterstitialState(INTERSTITIAL_STATE.OPENED)
                break
            case 'ad_shown':
                this._setInterstitialState(INTERSTITIAL_STATE.CLOSED)
                break
            case 'no_ads':
            case 'call_limit':
            case 'in_use':
            case 'app_in_fullscreen':
            default:
                this._setInterstitialState(INTERSTITIAL_STATE.FAILED)
                break
        }
    }

    #onRequestedBanner(result, data) {
        if (result === 'error') {
            this._setBannerState(BANNER_STATE.FAILED)
            return
        }
        switch (data) {
            case 'ad_loaded':
                this._platformSdk.invokeUIMethod('showBannerAds')
                break
            case 'banner_shown':
            case 'ad_shown':
                this._setBannerState(BANNER_STATE.SHOWN)
                break
            case 'hidden_by_user':
                this._setBannerState(BANNER_STATE.HIDDEN)
                break
            default:
                break
        }
    }

    #onHiddenBanner(data) {
        if (!data) {
            this._setBannerState(BANNER_STATE.FAILED)
        } else {
            this._setBannerState(BANNER_STATE.HIDDEN)
        }
    }

    #onShownBanner(data) {
        if (!data) {
            this._setBannerState(BANNER_STATE.FAILED)
        }
    }

    #onSetBannerFormat(result) {
        if (result === 'error') {
            this._setBannerState(BANNER_STATE.FAILED)
        } else {
            this.showBanner(this._platformBannerOptions)
        }
    }

    #onPurchaseConsumeCompleted(result) {
        if (result === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.CONSUME_PURCHASE)
        } else {
            this._resolvePromiseDecorator(ACTION_NAME.CONSUME_PURCHASE)
        }
    }

    #onInviteFriendsCompleted(result) {
        if (result === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.INVITE_FRIENDS)
        } else {
            this._resolvePromiseDecorator(ACTION_NAME.INVITE_FRIENDS)
        }
    }

    #onGameRatingRecieved(result, data) {
        if (result === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.RATE, data)
        } else {
            this._resolvePromiseDecorator(ACTION_NAME.RATE)
        }
    }

    #onPostCreated(result) {
        if (result === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.CREATE_POST)
        } else {
            this._resolvePromiseDecorator(ACTION_NAME.CREATE_POST)
        }
    }

    #onJoinGroupRequested(result, data) {
        if (result === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.JOIN_COMMUNITY, data)
        } else {
            this._resolvePromiseDecorator(ACTION_NAME.JOIN_COMMUNITY)
        }
    }

    #onPostCreatedCompleted(result, data) {
        if (result === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.CREATE_POST, data)
        } else {
            this._resolvePromiseDecorator(ACTION_NAME.CREATE_POST)
        }
    }
}

export default OkPlatformBridge
