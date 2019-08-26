/**
 *	Author: JCloudYu
 *	Create: 2019/07/19
**/
import {BuildArrayBuffer, CastArrayBufferToString, ExtractArrayBuffer} from "./_helper.esm.js";
import {Base64Encode, Base64URLEncode, Base64Decode, Base64SortEncode, Base64SortDecode} from "./base64.esm.js";
import {Base32Encode, Base32Decode} from "./base32.esm.js";

// See http://www.isthe.com/chongo/tech/comp/fnv/#FNV-param for the definition of these parameters;
const FNV_PRIME_HIGH = 0x0100, FNV_PRIME_LOW = 0x0193;	// 16777619 0x01000193
const OFFSET_BASIS = BuildArrayBuffer([0xC5, 0x9D, 0x1C, 0x81]);	// 2166136261 [0x81, 0x1C, 0x9D, 0xC5]
const HOSTNAME_CANDIDATES = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWZYZ_-";

export function fnv1a32(input){
	let octets = new Uint8Array(BuildArrayBuffer(input));
	
	const HASH_RESULT = new Uint32Array(BuildArrayBuffer(OFFSET_BASIS));
	const RESULT_PROC = new Uint16Array(HASH_RESULT.buffer);
	for( let i = 0; i < octets.length; i += 1 ) {
		HASH_RESULT[0] = HASH_RESULT[0] ^ octets[i];
		
		let hash_low = RESULT_PROC[0], hash_high = RESULT_PROC[1];
		
		RESULT_PROC[0] = hash_low * FNV_PRIME_LOW;
		RESULT_PROC[1] = hash_low * FNV_PRIME_HIGH + hash_high * FNV_PRIME_LOW + (RESULT_PROC[0]>>>16);
	}
	return HASH_RESULT.buffer;
}



let PID = (Math.random() * 65535)|0;
let PPID = (Math.random() * 65535)|0;
let MACHINE_ID = fnv1a32((()=>{
	let count = 30, str = '';
	while(count-- > 0) {
		str += HOSTNAME_CANDIDATES[(Math.random() * HOSTNAME_CANDIDATES.length)|0]
	}
	return str;
})());

let SEQ_NUMBER = (Math.random() * Number.MAX_SAFE_INTEGER)|0;
export class UniqueId {
	constructor(id=null, format='hex') {
		if ( typeof id === "string" ) {
			switch(format) {
				case "base64":
				case "base64url":
					id = Base64Decode(id);
					break;
					
				case "base64sort":
					id = Base64SortDecode(id);
					break;
				
				case "base32":
					id = Base32Decode(id);
					break;
					
				case "bits":
				case 2:
					id = BuildArrayBuffer( id, "bits" );
					break;
				
				case "hex":
				case 16:
				default:
					id = BuildArrayBuffer( id, "hex" );
					break;
			}
		}
		else
		if ( id instanceof ArrayBuffer ) {
			id = id.slice(0);
		}
		else
		if ( id instanceof UniqueId ) {
			id = id.bytes.buffer.slice(0);
		}
		else
		if ( id instanceof Uint8Array ) {
			id = id.buffer;
		}
		else {
			const time	= Date.now();
			const time_upper = Math.floor(time/0xFFFFFFFF);
			const time_lower = time%0xFFFFFFFF;
			const inc	= (SEQ_NUMBER=(SEQ_NUMBER+1) % 0xffffff);
			const buff	= new Uint8Array(20);
			const view	= new DataView(buff.buffer);
			
			view.setUint32(0, time_upper, false);		// [0-3] epoch time upper
			view.setUint32(4, time_lower, false);		// [4-7] epoch time lower
			buff.set(new Uint8Array(MACHINE_ID), 8);	// [8-11] machine id
			view.setUint16(12, PPID, false);			// [12-13] ppid
			view.setUint16(14, PID,  false);			// [14-15] pid
			view.setUint32(16, inc,	 false);			// [16-19] seq
			
			id = buff.buffer;
		}
		
		if ( !(id instanceof ArrayBuffer) || id.byteLength !== 20 ) {
			throw new TypeError( "Given input argument is invalid! Only ArrayBuffer, hex string or Uint8Array are accepted!" );
		}
		
		Object.defineProperty(this, 'bytes', {value:new Uint8Array(id), enumerable:true});
	}
	toString(format=16) {
		switch(format) {
			case "base64":
				return Base64Encode(this.bytes);
			
			case "base64url":
				return Base64URLEncode(this.bytes);
				
			case "base64sort":
				return Base64SortEncode(this.bytes);
			
			case "base32":
				return Base32Encode(this.bytes);
			
			case "hex":
				format=16;
				break;
				
			case "bits":
				format=2;
				break;
			
			default:
				break;
		}
		
		return CastArrayBufferToString(this.bytes.buffer, format, true);
	}
	compare(other) {
		if ( other instanceof UniqueId ) {
			other = other.bytes.buffer;
		}
		
		const self = this.bytes;
		other = new Uint8Array(ExtractArrayBuffer(other));
		if ( other.length !== 20 ) {
			throw new RangeError( "Given target is not a valid unique id!" );
		}
		
		for  ( let i=0; i<20; i++ ) {
			if ( self[i] < other[i] ) {
				return -1;
			}
			else
			if ( self[i] > other[i] ) {
				return 1;
			}
		}
		
		return 0;
	}
	toJSON() {
		return this.toString( 'hex' );
	}
	toBytes() { return this.bytes.slice(0); }
	static from(input=null) {
		try { return new UniqueId(input); } catch(e) { return null; }
	}
}



export async function InitAccordingToEnv() {
	if ( typeof Buffer !== "undefined" ) {
		const {default:os} = await import('os');
		
		MACHINE_ID = fnv1a32(os.hostname());
		PID = process.pid;
		PPID = process.ppid;
	}
	else
	if ( typeof window !== "undefined" ) {
		MACHINE_ID = window.location.host;
	}
}
