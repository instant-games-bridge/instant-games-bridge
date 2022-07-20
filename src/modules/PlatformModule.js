import ModuleBase from './ModuleBase'

class PlatformModule extends ModuleBase {

    get id() {
        return this._platformBridge.platformId
    }

    get sdk() {
        return this._platformBridge.platformSdk
    }

    get language() {
        return this._platformBridge.platformLanguage
    }

    get payload() {
        return this._platformBridge.platformPayload
    }

    get referrer() {
        return this._platformBridge.referrer
    }
}

export default PlatformModule