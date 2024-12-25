import { quais } from 'quais';

export const isValidQuaiAddress = (address) => {
    try {
        // Convert to checksum address
        const checksumAddress = quais.getAddress(address);
        return checksumAddress === address;
    } catch (error) {
        return false;
    }
};

export const toQuaiChecksumAddress = (address) => {
    try {
        return quais.getAddress(address);
    } catch (error) {
        console.error('Error converting to checksum address:', error);
        return address;
    }
};

export const formatAddress = (address) => {
    if (!address) return '';
    try {
        const checksumAddress = toQuaiChecksumAddress(address);
        return `${checksumAddress.slice(0, 6)}...${checksumAddress.slice(-4)}`;
    } catch (error) {
        console.error('Error formatting address:', error);
        return address;
    }
};

// Get the correct zone prefix based on the zone/shard
export const getZonePrefix = (zone) => {
    const zoneMap = {
        'cyprus1': '0x00',
        'cyprus2': '0x01',
        'cyprus3': '0x02',
        'paxos1': '0x03',
        'paxos2': '0x04',
        'paxos3': '0x05',
        'hydra1': '0x06',
        'hydra2': '0x07',
        'hydra3': '0x08'
    };
    return zoneMap[zone.toLowerCase()] || '0x00';
};

// Ensure address has correct zone prefix
export const ensureZonePrefix = (address, zone) => {
    if (!address) return address;
    
    const prefix = getZonePrefix(zone);
    if (!address.startsWith(prefix)) {
        return prefix + address.slice(4); // Replace the first two bytes with correct prefix
    }
    return address;
};