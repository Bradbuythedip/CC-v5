import React, { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from '@ethersproject/units';
import {
  Box,
  Button,
  Text,
  Slider,
  Spinner,
  Stack,
  Input,
  VStack,
  HStack,
  Heading,
} from '@chakra-ui/react';
import { toast } from 'react-hot-toast';
import { useWeb3 } from '../context/Web3Context';
import { formatAddress } from '../utils/pelagus';

interface ContractStats {
  totalSupply: bigint;
  maxSupply: bigint;
  mintPrice: bigint;
  hasFreeMint: boolean;
  isWhitelisted: boolean;
  mintsPerWallet: bigint;
}

const NFTMint: React.FC = () => {
  const { state, connectWallet } = useWeb3();
  const { contract, account, isConnected, loading } = state;

  const [mintAmount, setMintAmount] = useState<number>(1);
  const [contractStats, setContractStats] = useState<ContractStats>({
    totalSupply: 0n,
    maxSupply: 420n,
    mintPrice: parseUnits("1", 18),
    hasFreeMint: true,
    isWhitelisted: false,
    mintsPerWallet: 0n,
  });
  const [isMinting, setIsMinting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [newPrice, setNewPrice] = useState<string>("");
  const [newSupply, setNewSupply] = useState<string>("");

  useEffect(() => {
    if (contract && account) {
      loadContractData();
      checkIfOwner();
    }
  }, [contract, account]);

  const loadContractData = async () => {
    if (!contract || !account) return;

    try {
      const [
        totalSupply,
        maxSupply,
        mintPrice,
        hasFreeMint,
        isWhitelisted,
        mintsPerWallet
      ] = await Promise.all([
        contract.totalSupply(),
        contract.maxSupply(),
        contract.MINT_PRICE(),
        contract.hasFreeMint(account),
        contract.isWhitelisted(account),
        contract.mintsPerWallet(account)
      ]);

      setContractStats({
        totalSupply,
        maxSupply,
        mintPrice,
        hasFreeMint,
        isWhitelisted,
        mintsPerWallet
      });
    } catch (error) {
      console.error('Error loading contract data:', error);
      toast.error('Failed to load contract data');
    }
  };

  const checkIfOwner = async () => {
    try {
      const owner = await contract?.owner();
      setIsOwner(owner?.toLowerCase() === account?.toLowerCase());
    } catch (error) {
      console.error('Error checking owner:', error);
    }
  };

  const calculateMintCost = (): bigint => {
    if (contractStats.isWhitelisted) return 0n;
    if (contractStats.hasFreeMint) {
      return contractStats.mintPrice * BigInt(mintAmount - 1);
    }
    return contractStats.mintPrice * BigInt(mintAmount);
  };

  const handleMint = async () => {
    if (!contract || !account) return;

    try {
      setIsMinting(true);
      const mintCost = calculateMintCost();

      const tx = await contract.batchMint(BigInt(mintAmount), {
        value: mintCost
      });

      toast.loading('Minting your NFTs...', { id: tx.hash });
      await tx.wait();
      toast.success('NFTs minted successfully!', { id: tx.hash });

      await loadContractData();
    } catch (error: any) {
      console.error('Mint error:', error);
      toast.error(error.message || 'Failed to mint NFTs');
    } finally {
      setIsMinting(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!contract || !isOwner) return;

    try {
      const newPriceWei = quais.parseEther(newPrice);
      const tx = await contract.updateMintPrice(newPriceWei);
      
      toast.loading('Updating mint price...', { id: tx.hash });
      await tx.wait();
      toast.success('Mint price updated successfully!', { id: tx.hash });

      await loadContractData();
      setNewPrice("");
    } catch (error: any) {
      console.error('Update price error:', error);
      toast.error(error.message || 'Failed to update price');
    }
  };

  const handleUpdateSupply = async () => {
    if (!contract || !isOwner) return;

    try {
      const tx = await contract.updateMaxSupply(BigInt(newSupply));
      
      toast.loading('Updating max supply...', { id: tx.hash });
      await tx.wait();
      toast.success('Max supply updated successfully!', { id: tx.hash });

      await loadContractData();
      setNewSupply("");
    } catch (error: any) {
      console.error('Update supply error:', error);
      toast.error(error.message || 'Failed to update supply');
    }
  };

  const handleWithdraw = async () => {
    if (!contract || !isOwner) return;

    try {
      const tx = await contract.withdraw();
      
      toast.loading('Withdrawing funds...', { id: tx.hash });
      await tx.wait();
      toast.success('Funds withdrawn successfully!', { id: tx.hash });
    } catch (error: any) {
      console.error('Withdraw error:', error);
      toast.error(error.message || 'Failed to withdraw funds');
    }
  };

  return (
    <Box maxW="600px" mx="auto" p={6}>
      <VStack spacing={6}>
        <Heading size="xl" textAlign="center">
          Croak City NFT Mint
        </Heading>

        <VStack w="100%" spacing={4}>
          {/* Mint Amount Slider */}
          {isConnected && (
            <Box w="100%" px={4}>
              <Text mb={2}>
                Mint Amount: {mintAmount}
              </Text>
              <Slider
                value={mintAmount}
                onChange={(value: number) => setMintAmount(value)}
                min={1}
                max={20}
                isDisabled={isMinting}
              >
              </Slider>
              <Text fontSize="sm" color="gray.400">
                Cost: {formatUnits(calculateMintCost(), 18)} QUAI
              </Text>
            </Box>
          )}

          {/* Main Action Button */}
          <Button
            colorScheme="green"
            onClick={!isConnected ? connectWallet : handleMint}
            isDisabled={loading || isMinting}
            w="100%"
            size="lg"
          >
            {loading || isMinting ? (
              <Spinner size="sm" />
            ) : !window.pelagus ? (
              'Install Pelagus Wallet'
            ) : !isConnected ? (
              'Connect Wallet'
            ) : (
              `Mint ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}`
            )}
          </Button>

          {/* Owner Controls */}
          {isOwner && (
            <Box w="100%" mt={8}>
              <Heading size="md" mb={4}>
                Owner Controls
              </Heading>
              
              {/* Update Price */}
              <VStack spacing={4}>
                <HStack w="100%" spacing={4}>
                  <Input
                    type="number"
                    placeholder="New Price (QUAI)"
                    value={newPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPrice(e.target.value)}
                    flex={1}
                  />
                  <Button
                    colorScheme="blue"
                    onClick={handleUpdatePrice}
                    isDisabled={!newPrice}
                  >
                    Update Price
                  </Button>
                </HStack>

                {/* Update Supply */}
                <HStack w="100%" spacing={4}>
                  <Input
                    type="number"
                    placeholder="New Max Supply"
                    value={newSupply}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSupply(e.target.value)}
                    flex={1}
                  />
                  <Button
                    colorScheme="blue"
                    onClick={handleUpdateSupply}
                    isDisabled={!newSupply}
                  >
                    Update Supply
                  </Button>
                </HStack>

                {/* Withdraw */}
                <Button
                  colorScheme="purple"
                  onClick={handleWithdraw}
                  w="100%"
                >
                  Withdraw Funds
                </Button>
              </VStack>
            </Box>
          )}

          {/* Contract Information */}
          <Box w="100%" mt={8}>
            <Heading size="md" mb={4}>
              Contract Information
            </Heading>
            <VStack align="start" spacing={2}>
              <Text>
                Total Supply: {contractStats.totalSupply.toString()} / {contractStats.maxSupply.toString()}
              </Text>
              <Text>
                Mint Price: {formatUnits(contractStats.mintPrice, 18)} QUAI
              </Text>
              <Text>
                Your Mints: {contractStats.mintsPerWallet.toString()}
              </Text>
              <Text>
                Free Mint Available: {contractStats.hasFreeMint ? 'Yes' : 'No'}
              </Text>
              <Text>
                Whitelisted: {contractStats.isWhitelisted ? 'Yes' : 'No'}
              </Text>
              {account && (
                <Text>
                  Connected: {formatAddress(account)}
                </Text>
              )}
            </VStack>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
};

export default NFTMint;