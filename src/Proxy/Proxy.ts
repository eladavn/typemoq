﻿/// <reference path='_all.ts' />

namespace TypeMoqIntern.Proxy {
    export class Proxy<T> {
        constructor(interceptor: ICallInterceptor, instance: T) {
            this.check(instance);
            let that = this;

            let props = PropertyRetriever.getOwnAndPrototypeEnumerablesAndNonenumerables(instance);
            _.each(props, prop => {

                if (_.isFunction(prop.desc.value)) {
                    let propDesc: PropertyDescriptor = {
                        configurable: prop.desc.configurable,
                        enumerable: prop.desc.enumerable,
                        writable: prop.desc.writable,
                    };

                    this.defineMethodProxy(that, interceptor, instance, prop.name, propDesc);
                }
                else {
                    let propDesc: PropertyDescriptor = {
                        configurable: prop.desc.configurable,
                        enumerable: prop.desc.enumerable,
                    };

                    this.definePropertyProxy(that, interceptor, instance, prop.name, prop.desc.value, propDesc);
                }

            });
        }

        static of<U>(instance: U, interceptor: ICallInterceptor) {
            Proxy.check(instance);

            let result: any;

            if (_.isFunction(instance)) {
                let funcName = Utils.functionName(instance);
                result = Proxy.methodProxyValue(interceptor, instance, funcName);
            }
            else {
                result = new Proxy(interceptor, instance);
            }

            return result;
        }

        private static check<U>(instance: U): void {
            Proxy.checkNotNull(instance);

            // allow only primitive objects and functions
            let ok = false;
            if (_.isFunction(instance) ||
                (_.isObject(instance) && !Proxy.isPrimitiveObject(instance)))
                ok = true;
            
            if (!ok)
                throw new error.MockException(error.MockExceptionReason.InvalidProxyArgument,
                    instance, "InvalidProxyArgument Exception", "Argument should be a function or a non primitive object");
        }

        private check<U>(instance: U): void {
            Proxy.checkNotNull(instance);

            // allow only non primitive objects
            let ok = false;
            if (!_.isFunction(instance) &&
                (_.isObject(instance) && !Proxy.isPrimitiveObject(instance)))
                ok = true;

            if (!ok)
                throw new error.MockException(error.MockExceptionReason.InvalidProxyArgument,
                    instance, "InvalidProxyArgument Exception", "Argument should be a non primitive object");
        }

        private static checkNotNull<U>(instance: U): void {
            if (_.isNull(instance))
                throw new error.MockException(error.MockExceptionReason.InvalidProxyArgument,
                    instance, "InvalidProxyArgument Exception", "Argument cannot be null");
        }

        private static isPrimitiveObject(obj: Object): boolean {
            let result = false;

            if (_.isFunction(obj) ||
                _.isArray(obj) ||
                _.isDate(obj) ||
                _.isNull(obj))
                result = true;

            return result;
        }

        private defineMethodProxy(
            that: Object,
            interceptor: ICallInterceptor,
            instance: T,
            propName: string,
            propDesc: PropertyDescriptor = { configurable: false, enumerable: true, writable: false }) {

            propDesc.value = Proxy.methodProxyValue(interceptor, instance, propName);

            this.defineProperty(that, propName, propDesc);
        }

        private static methodProxyValue<U>(
            interceptor: ICallInterceptor,
            instance: U,
            propName: string): () => any {

            function proxy() {
                let method = new MethodInfo(instance, propName);
                let invocation: ICallContext = new MethodInvocation(method, arguments);
                interceptor.intercept(invocation);
                return invocation.returnValue;
            }
            return proxy;
        }

        private definePropertyProxy(
            that: Object,
            interceptor: ICallInterceptor,
            instance: T,
            propName: string,
            propValue: any,
            propDesc: PropertyDescriptor = { configurable: false, enumerable: true }) {

            function getProxy(): any {
                let method = new PropertyInfo(instance, propName);
                let invocation: ICallContext = new GetterInvocation(method, propValue);
                interceptor.intercept(invocation);
                return invocation.returnValue;
            }
            propDesc.get = getProxy;

            function setProxy(v: any): void {
                let method = new PropertyInfo(instance, propName);
                let invocation: ICallContext = new SetterInvocation(method, arguments);
                interceptor.intercept(invocation);
            }
            propDesc.set = setProxy;

            this.defineProperty(that, propName, propDesc);
        }

        private defineProperty(obj: Object, name: string, desc: PropertyDescriptor) {
            try {
                Object.defineProperty(obj, name, desc);
            }
            catch (e) {
                console.log(e.message);
            }
        }

    }
} 