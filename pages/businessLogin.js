import { auth, firestore, googleAuthProvider } from '../lib/firebase';
import { AuthContext } from '../lib/context';
import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import BusinessNameForm from '../components/BusinessNameForm';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {FormErrorMessage,Flex,Box,FormControl,FormLabel,Input,Checkbox,Stack,Link,Button,Heading,Text,useColorModeValue,
} from '@chakra-ui/react';

// set Google Maps Geocoding API for purposes of quota management. Its optional but recommended.


export default function BusinessLogin(props) {
  const { userType, user } = useContext(AuthContext);
  const [businessName, setBusinessName] = useState("");
  const [isSignIn,setIsSignIn] = useState(true);

  useEffect(() => {
    // turn off realtime subscription
    let unsubscribe;

    if (user) {
      const ref = firestore.collection('businesses').doc(user.uid);
      unsubscribe = ref.onSnapshot((doc) => {
        setBusinessName(doc.data()?.businessName);
      });
    } else {
      setBusinessName(null);
    }

    return unsubscribe;
  }, [user]);

  return (
        user ? userType ==='customer' ? <UserIsCustomer/> :  businessName ? <SignOutButton /> : <BusinessNameForm/>: (isSignIn ? <SignInForm setIsSignIn={setIsSignIn} /> : <SignUpForm setIsSignIn={setIsSignIn} />)
  );
}

function UserIsCustomer(){
    return (
        <div>User is already a customer
          <SignOutButton />
        </div>
    );
}

const signInSchema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().required(),
});

const signUpSchema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().min(8).max(32).required(),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Password confirmation is required.')
});

// Sign in with Google button
function SignInForm({setIsSignIn}) {
  const [errorMessage,setErrorMessage] = useState(null);
  const { register, handleSubmit, formState: { errors }} = useForm({
    resolver: yupResolver(signInSchema),
  });
    
  const onGoogleSubmit = async () => {
    await auth.signInWithPopup(googleAuthProvider);
    const userDoc = firestore.collection('users').doc(auth.currentUser.uid);
    const { exists } = await userDoc.get();
    if(!exists){
      const businessDoc = firestore.collection('businesses').doc(auth.currentUser.uid);
      // Commit both docs together as a batch write.
      const batch = firestore.batch();
      batch.set(userDoc, { uid:auth.currentUser.uid, photoURL: auth.currentUser.photoURL, displayName: '', userType:'business'});
      batch.set(businessDoc, { uid: auth.currentUser.uid });
      await batch.commit();
    }

  };

  const onEmailSubmit = async ({email,password})=>{
    try{
      await signInWithEmailAndPassword(auth, email, password);
    }
    catch(err){
      console.log(err)
      setErrorMessage("Incorrect username or password")
    }
  }

  return (
    <Flex
      minH={'calc(100vh - 60px)'}
      justify={'center'}
      bg={'gray.50'}>
      <Stack spacing={8} mx={'auto'} w = {'lg'} py={12} px={6}>
        <Stack align={'center'}>
          <Heading fontSize={{ base: "2xl",sm:"3xl", md: "4xl"}}>Sign in to your account</Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            to start managing subscriptions ✌️
          </Text>
        </Stack>
        <Box
          rounded={'lg'}
          bg={'white'}
          boxShadow={'lg'}
          p={8}>
          <Stack spacing={4}>
            <form onSubmit={handleSubmit(onEmailSubmit)}>
              <Stack spacing={5}>
                <FormControl id="email" isInvalid={errors.email?.message}>
                  <FormLabel>Email</FormLabel>
                  <Input type="email" {...register("email")} />
                  <FormErrorMessage>{errors.email?.message.charAt(0).toUpperCase() + errors.email?.message.slice(1)}</FormErrorMessage>
                </FormControl>
                <FormControl id="password" isInvalid={errors.password?.message}>
                  <FormLabel>Password</FormLabel>
                  <Input {...register("password")} type="password" />
                  <FormErrorMessage>{errors.password?.message.charAt(0).toUpperCase() + errors.password?.message.slice(1)}</FormErrorMessage>
                </FormControl>
              </Stack>
              <Stack spacing={5} mt={5}>
                <Stack
                  direction={'column'}
                  align={'end'}>
                  <Link color={'blue.400'} onClick={()=>setIsSignIn(false)}>Create an account</Link>
                </Stack>
                {errorMessage ? <Text fontSize={'sm'}color={'red.500'}>{errorMessage}</Text> :null}
                <Button
                  bg={'blue.400'}
                  color={'white'}
                  _hover={{
                    bg: 'blue.500',
                  }} type="submit">
                  Sign in
                </Button>
              </Stack>
            </form>
            <button className="btn-google" onClick={onGoogleSubmit}>
              <img src={'/google.png'} width="30px" /> Sign in with Google
            </button>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
}

// Sign out button
function SignOutButton() {
  const router = useRouter();
  return (<div>
    <button onClick={()=>router.push(`/dashboard`)}>Go to Dashboard</button>
    <button onClick={() => auth.signOut()}>Sign Out</button>
    </div>
  );
}

function SignUpForm({setIsSignIn}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(signUpSchema),
  });
  const [errorMessage,setErrorMessage] = useState(null)

  const handleSignup = async ({ email, password})=> {
    try{
      await createUserWithEmailAndPassword(auth, email, password)
      setErrorMessage(null)
    }
    catch(err){
      console.log(err)
      setErrorMessage(err.message)
    }
      
    if(auth.currentUser){
      const userDoc = firestore.doc(`users/${auth.currentUser.uid}`);
      const { exists } = await userDoc.get();
      if(!exists){
        // Commit both docs together as a batch write.
        userDoc.set({ uid:auth.currentUser.uid, photoURL: auth.currentUser.photoURL, displayName: '', userType:'business'});
        setIsSignIn(true);
      }
    }
    
  };

  return (
    <Flex
      minH={'calc(100vh - 60px)'}
      justify={'center'}
      bg={'gray.50'}>
      <Stack spacing={8} mx={'auto'} w = {'lg'}  py={12} px={6}>
        <Stack align={'center'}>
          <Heading fontSize={{ base: "2xl",sm:"3xl", md: "4xl"}}>Create a business account</Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            to start selling subscriptions ✌️
          </Text>
        </Stack>
        <Box
          rounded={'lg'}
          bg={'white'}
          boxShadow={'lg'}
          p={8}>
            <form onSubmit={handleSubmit(handleSignup)}>
            <Stack spacing={5}>
              <FormControl id="email" isInvalid={errors.email?.message}>
                <FormLabel>Email</FormLabel>
                <Input type="email" {...register("email")} />
                <FormErrorMessage>{errors.email?.message.charAt(0).toUpperCase() + errors.email?.message.slice(1)}</FormErrorMessage>
              </FormControl>

              <FormControl id="password" isInvalid={errors.password?.message}>
                <FormLabel>Password</FormLabel>
                <Input {...register("password")} type="password" />
                <FormErrorMessage>{errors.password?.message.charAt(0).toUpperCase() + errors.password?.message.slice(1)}</FormErrorMessage>
              </FormControl>
              
              <FormControl id="confirmPassword" isInvalid={errors.confirmPassword?.message}>
                <FormLabel>Confirm Password</FormLabel>
                <Input {...register("confirmPassword")} type="password" />
                <FormErrorMessage>{errors.confirmPassword?.message}</FormErrorMessage>
              </FormControl>
              <Stack spacing={5} mt={5}>
                <Stack
                  direction={'column'}
                  align={'end'}>
                  <Link color={'blue.400'} onClick={()=>setIsSignIn(true)}>Already have an account?</Link>
                </Stack>
                {errorMessage ? <Text fontSize={'sm'}color={'red.500'}>{errorMessage}</Text> :null}
                <Button
                  bg={'blue.400'}
                  color={'white'}
                  _hover={{
                    bg: 'blue.500',
                  }} type="submit">
                  Sign up
                </Button>
              </Stack>
              </Stack>
            </form>
        </Box>
      </Stack>
    </Flex>
  );
}



