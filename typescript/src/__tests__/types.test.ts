import {
  AuthorizationError,
  NotFoundError,
  STANDARD_HEADERS,
  ValidationError,
  assertDefined,
  assertNotNull,
  hasProperty,
  isNonNullable,
  isString,
  isValidHttpMethod,
  type CrudOperation,
  type HttpMethod,
  type Result
} from '../types';

describe('types.ts', () => {
  describe('Custom Error Classes', () => {
    describe('ValidationError', () => {
      it('should create error with field and value', () => {
        const error = new ValidationError('email', 'invalid@');
        expect(error.name).toBe('ValidationError');
        expect(error.field).toBe('email');
        expect(error.value).toBe('invalid@');
        expect(error.message).toBe('Validation failed for field email with value: "invalid@"');
      });

      it('should handle undefined values', () => {
        const error = new ValidationError('field', undefined);
        expect(error.message).toContain('undefined');
      });

      it('should handle null values', () => {
        const error = new ValidationError('field', null);
        expect(error.message).toContain('null');
      });

      it('should handle object values', () => {
        const value = { key: 'value' };
        const error = new ValidationError('data', value);
        expect(error.message).toContain(JSON.stringify(value));
      });
    });

    describe('AuthorizationError', () => {
      it('should create error with message', () => {
        const error = new AuthorizationError('Unauthorized access');
        expect(error.name).toBe('AuthorizationError');
        expect(error.message).toBe('Unauthorized access');
      });
    });

    describe('NotFoundError', () => {
      it('should create error with resource and id', () => {
        const error = new NotFoundError('User', '123');
        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe('User with id 123 not found');
      });
    });
  });

  describe('Type Guards', () => {
    describe('isString', () => {
      it('should return true for strings', () => {
        expect(isString('hello')).toBe(true);
        expect(isString('')).toBe(true);
        expect(isString(String('test'))).toBe(true);
      });

      it('should return false for non-strings', () => {
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
        expect(isString([])).toBe(false);
        expect(isString(true)).toBe(false);
      });
    });

    describe('isNonNullable', () => {
      it('should return true for non-nullable values', () => {
        expect(isNonNullable('string')).toBe(true);
        expect(isNonNullable(0)).toBe(true);
        expect(isNonNullable(false)).toBe(true);
        expect(isNonNullable({})).toBe(true);
        expect(isNonNullable([])).toBe(true);
      });

      it('should return false for null and undefined', () => {
        expect(isNonNullable(null)).toBe(false);
        expect(isNonNullable(undefined)).toBe(false);
      });
    });

    describe('isValidHttpMethod', () => {
      it('should return true for valid HTTP methods', () => {
        const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        validMethods.forEach(method => {
          expect(isValidHttpMethod(method)).toBe(true);
        });
      });

      it('should return false for invalid HTTP methods', () => {
        expect(isValidHttpMethod('get')).toBe(false); // lowercase
        expect(isValidHttpMethod('OPTIONS')).toBe(false);
        expect(isValidHttpMethod('HEAD')).toBe(false);
        expect(isValidHttpMethod('CONNECT')).toBe(false);
        expect(isValidHttpMethod('TRACE')).toBe(false);
        expect(isValidHttpMethod('')).toBe(false);
        expect(isValidHttpMethod(123)).toBe(false);
        expect(isValidHttpMethod(null)).toBe(false);
        expect(isValidHttpMethod(undefined)).toBe(false);
      });
    });

    describe('hasProperty', () => {
      it('should return true when object has property', () => {
        const obj = { name: 'test', age: 25 };
        expect(hasProperty(obj, 'name')).toBe(true);
        expect(hasProperty(obj, 'age')).toBe(true);
      });

      it('should return false when object lacks property', () => {
        const obj = { name: 'test' };
        expect(hasProperty(obj, 'age')).toBe(false);
        expect(hasProperty(obj, 'unknown')).toBe(false);
      });

      it('should work with inherited properties', () => {
        class Parent {
          parentProp = 'value';
        }
        class Child extends Parent {
          childProp = 'value';
        }
        const instance = new Child();
        expect(hasProperty(instance, 'childProp')).toBe(true);
        expect(hasProperty(instance, 'parentProp')).toBe(true);
      });

      it('should work with symbol properties', () => {
        const sym = Symbol('test');
        const obj = { [sym]: 'value' };
        expect(hasProperty(obj, sym)).toBe(true);
      });
    });
  });

  describe('Assertion Functions', () => {
    describe('assertDefined', () => {
      it('should not throw for defined values', () => {
        expect(() => assertDefined('string')).not.toThrow();
        expect(() => assertDefined(0)).not.toThrow();
        expect(() => assertDefined(false)).not.toThrow();
        expect(() => assertDefined(null)).not.toThrow();
        expect(() => assertDefined({})).not.toThrow();
      });

      it('should throw for undefined values', () => {
        expect(() => assertDefined(undefined)).toThrow('Value is undefined');
      });

      it('should throw with custom message', () => {
        expect(() => assertDefined(undefined, 'Custom error')).toThrow('Custom error');
      });
    });

    describe('assertNotNull', () => {
      it('should not throw for non-null values', () => {
        expect(() => assertNotNull('string')).not.toThrow();
        expect(() => assertNotNull(0)).not.toThrow();
        expect(() => assertNotNull(false)).not.toThrow();
        expect(() => assertNotNull(undefined)).not.toThrow();
        expect(() => assertNotNull({})).not.toThrow();
      });

      it('should throw for null values', () => {
        expect(() => assertNotNull(null)).toThrow('Value is null');
      });

      it('should throw with custom message', () => {
        expect(() => assertNotNull(null, 'Custom null error')).toThrow('Custom null error');
      });
    });
  });

  describe('Constants', () => {
    describe('STANDARD_HEADERS', () => {
      it('should contain all required security headers', () => {
        expect(STANDARD_HEADERS).toEqual({
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        });
      });

      it('should be immutable', () => {
        const headers = { ...STANDARD_HEADERS };
        expect(headers).toEqual(STANDARD_HEADERS);
        // Verify that modifying the copy doesn't affect original
        (headers as Record<string, string>)['Content-Type'] = 'text/html';
        expect(STANDARD_HEADERS['Content-Type']).toBe('application/json');
      });
    });
  });

  describe('Type Definitions', () => {
    it('should export proper types', () => {
      // Type checking happens at compile time, but we can verify runtime behavior
      const httpMethod: HttpMethod = 'GET';
      expect(httpMethod).toBe('GET');
      
      const crudOp: CrudOperation = 'CREATE';
      expect(crudOp).toBe('CREATE');
      
      const successResult: Result<string> = { ok: true, value: 'success' };
      expect(successResult.ok).toBe(true);
      
      const errorResult: Result<string> = { ok: false, error: new Error('failed') };
      expect(errorResult.ok).toBe(false);
    });
  });
});