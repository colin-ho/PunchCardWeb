import { Box, Circle, Flex, Grid, Heading, Spacer, Text, VStack } from '@chakra-ui/layout';
import { Menu, MenuButton, MenuItem, MenuList, Slide } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react'
import { BiDotsHorizontalRounded } from 'react-icons/bi';
import { Button, IconButton } from '@chakra-ui/button';
import { arrayRemove, arrayUnion, firestore } from '../lib/firebase';
import { useDisclosure } from '@chakra-ui/hooks';

export default function ActiveSales({ businessName,subscriptions,redemptions,open,delay}:any) {
    const [newOrderCount,setNewOrderCount] = useState(0);
    const [inProgressCount,setInProgressCount] = useState(0);
    const [lateCount,setLateCount] = useState(0);
    
    useEffect(() => {
        setLateCount(0);
        setInProgressCount(0);
        setNewOrderCount(0);
        redemptions.map((r:any)=>{
            if(!r.confirmed ) setNewOrderCount(newOrderCount=>newOrderCount+1);
            else setInProgressCount(inProgressCount=>inProgressCount+1);
            if(r.collectBy.toDate() < new Date()) setLateCount(lateCount=>lateCount+1);
        })
        let interval = setInterval(() => {
            setLateCount(0);
            redemptions.map((r:any)=>{
                if(r.collectBy.toDate() < new Date()) setLateCount(lateCount=>lateCount+1);
            })
          }, 10000);
        return () => clearInterval(interval);
      }, [redemptions]);

    
    return (
        <Flex direction = "column" align="flex-start">
            <Heading  size="lg" mb="10px"> Active Sales Overview</Heading>
            <Text>{businessName} is currently<b> {!open ? ' closed': ' open and accepting redemptions'}
        {open&&(parseInt(delay)>0) ? ` with ${delay} min delay` :null }</b></Text>

            <Flex marginTop = "30px" h="150px" w="100%"direction="row">
                <Flex p="20px" alignItems="flex-start" direction="column" borderRadius="20px" w="32%" boxShadow="0px 16px 50px rgba(0, 0, 0, 0.12)"bg={'#fff'}>
                    <Text borderRadius="5px"fontWeight="500" bg={"brand.400"} px="2" >Received Orders</Text>
                    <Text mt="5px" as="b"flex="1">Needs preparing</Text>
                    <Text  fontSize="3xl">{newOrderCount}</Text>
                </Flex>
                <Spacer/>
                <Flex p="20px" alignItems="flex-start"direction="column"borderRadius="20px"w="32%" boxShadow="0px 16px 50px rgba(0, 0, 0, 0.12)"bg={'#fff'}>
                    <Text borderRadius="5px" fontWeight="500" bg={"brand.300"} px="2">Ready</Text>
                    <Text mt="5px"as="b" flex="1">Awaiting collection</Text>
                    <Text fontSize="3xl">{inProgressCount}</Text>
                </Flex>
                <Spacer/>
                <Flex p="20px" alignItems="flex-start"direction="column"borderRadius="20px"w="32%" boxShadow="0px 16px 50px rgba(0, 0, 0, 0.12)"bg={'#fff'}>
                    <Text borderRadius="5px" fontWeight="500" bg={"brand.200"} px="2" >Late</Text>
                    <Text mt="5px"as="b" flex="1">Past due</Text>
                    <Text  fontSize="3xl">{lateCount}</Text>
                </Flex>
            </Flex>

            <Heading mt="30px" size="lg" mb="30px"> Open Orders</Heading>
            <Flex direction="column" w="100%">
                {redemptions.length !== 0 ? redemptions.map((redemption:any)=>{
                    return <OrderItem key={redemption.code} redemption={redemption} subscription={subscriptions.filter((subscription:any)=>subscription.id == redemption.subscriptionId)[0]}/>
                }) : <Text>Waiting for new orders ...</Text>}
            </Flex>
        </Flex>
    )
}


function OrderItem({ redemption,subscription }:any) {
    const customerDataRef = firestore.collection('customers').doc(redemption.redeemedById)
    const now:any = new Date();
    const redemptionTime = typeof redemption?.redeemedAt === 'number' ? new Date(redemption.redeemedAt) : redemption.redeemedAt.toDate();
    const collectionTime = typeof redemption?.collectBy === 'number' ? new Date(redemption.collectBy) : redemption.collectBy.toDate();
    const received = Math.floor((now - redemptionTime) / (1000 * 60));
    const due = (collectionTime - now) / (1000 * 60);
    const confirm = async ()=>{
        const ref = firestore.collection('businesses').doc(subscription.businessId).collection('subscriptions').doc(subscription.id).collection('redemptions').doc(redemption.id);
        const batch = firestore.batch();
        batch.update(ref,{confirmed:true})
        batch.update(customerDataRef,{confirmed:arrayRemove(ref),ready:arrayUnion(ref)})
        await batch.commit();
    }

    const collected = async ()=>{
        const redRef = firestore.collection('businesses').doc(subscription.businessId).collection('subscriptions').doc(subscription.id).collection('redemptions').doc(redemption.id);
        const customerRef = firestore.collection('businesses').doc(subscription.businessId).collection('subscriptions').doc(subscription.id).collection('customers').doc(redemption.redeemedById);
        const customerDataRef = firestore.collection('customers').doc(redemption.redeemedById)
        const batch = firestore.batch();
        batch.update(redRef,{collected:true});
        batch.update(customerRef,{redeeming:false,code:'',currentRef:''});
        batch.update(customerDataRef,{ready:arrayRemove(redRef)})
        await batch.commit();
    }
    //
    return (
        <Box overflow="hidden"  boxShadow="0px 16px 50px rgba(0, 0, 0, 0.12)"bg={'#fff'} w="100%" p={6} pb="30px"borderRadius="20px" position="relative"  mb="20px">
            <Text borderRadius="5px"as="span" fontWeight="500" bg={due<0 ? "brand.200": !redemption.confirmed ? "brand.400" : "brand.300" } px="2" py="1">{due<0 ? "Late": !redemption.confirmed ? "Received" : "Ready" }</Text>
            <Grid gap={6} mt="10px" templateColumns="repeat(4, 1fr)" >
                <VStack spacing={1} alignItems="start">
                    <Text as="b">{redemption.redeemedBy}</Text>
                    <Text >{"Release "}{due<0 ? "now" : "in " + Math.ceil(due) + " min"}</Text>
                    <Text >{"Received "+received + " min ago"}</Text>
                </VStack>
                <VStack spacing={1} alignItems="start">
                    <Text as="b">Overview</Text>
                    <Text >{subscription.title}</Text>
                    <Text>{"1x "+subscription.content}</Text>
                </VStack>
                <VStack spacing={1} alignItems="start">
                    <Text as="b">Customer Message</Text>
                    <Text>{redemption.requests ? "\"" + redemption.requests +"\"": " "}</Text>
                </VStack>
                <VStack spacing={1} alignItems="start">
                <Text as="b" >Redemption Code: {redemption.code}</Text>
                    <Button fontSize={'md'} variant="ghost" fontWeight={500} onClick={!redemption.confirmed ? confirm : collected }
                color={'white'} bg={'black'} _hover={{bg: 'black',color:'white'}}>
                {!redemption.confirmed ? "Mark as ready" : "Complete order" }</Button>
                
                </VStack>
                
            </Grid>
            {/*
            <Circle position="absolute" right="-3" top="-3" cursor= "pointer" size="60px" bg="white">
                <Menu >
                    <MenuButton
                        as={IconButton}
                        icon={<BiDotsHorizontalRounded/>}
                        variant="ghost"
                        borderRadius="50px"
                        w="60px"
                        h="60px"
                    />
                    <MenuList mt="-30px" mr="30px">
                        <MenuItem onClick={!redemption.confirmed ? confirm : collected }>
                        {!redemption.confirmed ? "Confirm" : "Collected" }
                        </MenuItem>
                    </MenuList>
                </Menu>
            </Circle>*/}
        </Box>
      
    );
}