import ModuleBase from './ModuleBase'

class PaymentsModule extends ModuleBase {

    get isSupported() {
        return this._platformBridge.isPaymentsSupported
    }

    showOrderPayments(title) {
        return this._platformBridge.showOrderPayments(title)
    }

}

export default PaymentsModule