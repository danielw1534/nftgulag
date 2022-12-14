import { useEffect, useState,useRef, Fragment } from "react";
import {DateTime} from "luxon"
import {BsFillInfoCircleFill} from "react-icons/bs"
import { Dialog, Transition } from '@headlessui/react'
import { CurrencyDollarIcon } from '@heroicons/react/outline'
import { Tooltip,IconButton } from "@material-tailwind/react";
import 'react-calendar/dist/Calendar.css'; import 'react-clock/dist/Clock.css';
import 'react-datetime-picker/dist/DateTimePicker.css';
import Gulag_ABI from "../../contracts/NewGulag.json";
import type { NewGulag } from "../../contracts/types";
import { parseEther } from "@ethersproject/units";
import useContract from "../../hooks/useContract";
import {  Loading} from "web3uikit"
import { NFT } from "../NFTStylized";
import {CardGroup,Card } from 'reactstrap';
import usePagination from "../../hooks/usePagination";
import NoData from "../other/NoData";
import { useToast } from "../toast/ToastProvider";
import { BigNumberish } from "ethers";


const useGulagContract = () => {
  return useContract<NewGulag>(process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ADDRESS as string, Gulag_ABI);
}

const LiveGulags = () => {
  const [ethAmount, setEthAmount] = useState("");
  const [open,setOpen] = useState(false)
  const cancelButtonRef = useRef(null)
  const [wagerGetter,setWagerGetter] = useState(0)
  const [error, setError] = useState(false);
  const [gulags,setGulags]:any = useState([])
  const initialGulag: never[] = [];
  const [loading, setLoading] = useState(true);
  const {
    firstContentIndex,
    lastContentIndex,
    nextPage,
    prevPage,
    page,
    gaps,
    setPage,
    totalPages,
  } = usePagination({
    contentPerPage: 1,
    count: gulags.length,
  });
  const toast = useToast()
  const contract = useGulagContract();

  const voteForGulag = async (battleNumber: any, voteReceiver: BigNumberish) => {

    if (contract) {
      await contract
      .voteForNFT(
       (battleNumber), voteReceiver)
        .then(response => {
          console.log("response", response);
        })
        .catch(error => {
          toast?.pushError(`Voting Error: ${error.error.message}`, 10000)
          console.error(error);
        });
    }
  }

  const wagerOnGulag = async (battleStartTimeMs: number,battleNumber: any, ethForCall: string) => {
   
    if ((DateTime.fromJSDate(new Date(battleStartTimeMs*1000))).plus({days:14})<DateTime.now().toUTC()) {
      toast?.pushError(`Wager Error: Wager period is over`, 10000)
      return
    }
    if (wagerGetter!==1 && wagerGetter!==2) {
      toast?.pushError("Unknown wager getter",10000)
      return
    }
    console.log("eth for call: ",ethForCall)
    const payableValue = parseEther((parseFloat(ethForCall)+0.01).toString());

    if (contract) {
      await contract
      .wagerOnNFT(
       (battleNumber), wagerGetter,
      {gasLimit:4000000,value:payableValue})
        .then(response => {
          console.log("response", response);
          toast?.pushSuccess("Successfully submitted wager",10000)
        })
        .catch(error => {
          toast?.pushError(`Wager Error: ${error}`, 10000)
          console.error(error);
        });
    }
  }

  useEffect(() => {
    (async () => {
      try {
        if (contract) {
          setGulags(initialGulag);
          const totalBattles = await contract.stateBattleNumber()
          for (let i = 0; i<totalBattles.toNumber() ; i++) {
            await contract
            .battles(
              i)
              .then(async (response) =>   {
                const challengerTotalByBattleWei = await contract.mappedTotalWagerAmountByBattleForChallenger(i)
                const creatorTotalByBattleWei = await contract.mappedTotalWagerAmountByBattleForCreator(i)
                const battleTotalWagerEth = parseInt(challengerTotalByBattleWei._hex,16)/(1000000000000000000) + parseInt(creatorTotalByBattleWei._hex,16)/(1000000000000000000)
                const gulagsArray:any[] = gulags
                if (response.battleChallenger.challenger!=="0x0000000000000000000000000000000000000000") {
                  gulagsArray.push(
                    {creatorNftAddress: response.battleCreator.battleCreatorNFTAddress,
                    creatorNftTokenId: response.battleCreator.battleCreatorNFTTokenId.toString(),
                    creatorNftChain: response.battleCreator.battleCreatorNFTChain,
                    challengerNftAddress: response.battleChallenger.challengerNFTAddress,
                    challengerNftTokenId: response.battleChallenger.challengerNFTTokenId.toString(),
                    challengerNftChain: response.battleChallenger.challengerNFTChain,
                    battleNumber: response.battleNumber.toNumber(),
                    battleStartTime: response.battleTiming.startTime,
                    battleStarted: response.battleTiming.battleStarted,
                    battleWagerPeriodOver: response.battleTiming.wagerPeriodOver,
                    battleVotingPeriodOver: response.battleTiming.votingPeriodOver,
                    battleTotalWagered: battleTotalWagerEth
                  })
                  setGulags(gulagsArray)
                }
              }
              )
              .catch(error => {
                setError(error)
                console.error("error: ",error);
              });
          }
        }
      }
      catch {
        setError(true)
      }
      finally {
        setLoading(false)
      }
    } )()
},[]);
  return (
    <div>
      {error ? <NoData /> :
      loading  ? (
        <div
        style={{
        //   backgroundColor: '#ECECFE',
          borderRadius: '8px',
          padding: '20px',
          display: "flex",
          justifyContent: "space-evenly",
          flexWrap: "wrap",
        }}
      >
        <Loading
          size={40}
          spinnerColor="#2E7DAF"
          text="Loading..."
        />
      </div>
    )  :
    gulags.length===0 ? 
    gulags.length===0 && (
      <NoData />
    ) :
      gulags.length>0 &&
        <NFT   
        address={gulags[0].creatorNftAddress}
        chain={gulags[0].creatorNftChain}
        fetchMetadata
        tokenId={gulags[0].creatorNftTokenId}/> 
        ?
        <div>
        
            <div style={{width:"67%"}} className="items">
              {gulags.slice(firstContentIndex,lastContentIndex).map((gulag:any,index: any)=> (
                
                <div className="card-group w-70vw justify-between" key={index}>
                  <h1 style={{display: "flex",
        justifyContent: "space-evenly",
        flexWrap: "wrap",
        marginBottom: "20px",
        marginTop: "20px"}} className="text-2xl text-gray-900 font-bold whitespace-pre-line leading-hero">
          Gulag # {gulag.battleNumber+1}
        </h1>
                <CardGroup className="justify-between">
                <Card style={{
        display: "flex",
        justifyContent: "space-evenly",
        flexWrap: "wrap",
        marginBottom: "40px"
      }}>
        <div style={{border:"150%"}}>
          <NFT
            address={gulag.creatorNftAddress}
            chain={gulag.creatorNftChain}
            fetchMetadata
            tokenId={gulag.creatorNftTokenId} /> 
                        <div className="form">
            <Card style={{
        display: "flex",
        justifyContent: "space-evenly",
        flexWrap: "wrap",
        marginBottom: "40px"
      }}>
          <button className="interact-button-wager" onClick={() => {
            setWagerGetter(1)
            setOpen(true)
          }}>Wager</button>
          <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 text-center lg:p-5">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="md relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all lg:my-8 lg:max-w-lg lg:w-full">
                <div className="bg-white flex justify-center mt-2 px-4 pt-5 pb-4 lg:p-6 lg:pb-4">
                  <div className="flex mt-2 lg:items-start">
                    <div className="mx-auto flex-shrink-0 flex mt-3 items-center justify-center h-12 w-12 rounded-full bg-green-100 lg:mx-0 lg:h-10 lg:w-10">
                      <CurrencyDollarIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                    </div>
                    <div className="interact-button-vote mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <Dialog.Title as="h3" className="mt-2 interact-button-vote text-lg leading-6 font-medium text-gray-900">
                        Wager on Gulag # {gulag.battleNumber+1}
                      </Dialog.Title>
                      <div className="mt-2">
                      <div className="form-row" style={{display: "flex",
        justifyContent: "space-evenly",
        flexWrap: "wrap",
        marginBottom: "20px",
        marginTop: "20px"}}>
        <span>Amount of ETH to wager</span>
        <input placeholder="Ex. 0.2" type="number" onChange={(event) => setEthAmount(event.target.value)}></input>
        {/* <span className="hint-text">*An additional ??0.01 is required for the bot to execute the future transaction. The remainder will be sent back to you if there is any.</span> */}
      </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-300 px-4 border-8 border-gray-300 mt-3 mb-3 sm:px-6 justify-evenly flex flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-8 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={async() => {
                      await wagerOnGulag(gulag.battleStartTime,gulag.battleNumber, ethAmount)
                      setOpen(false)
                    }
                    
                  }
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    className="interact-button-vote mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setOpen(false)}
                    // ref={cancelButtonRef}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
            <button className="interact-button-vote" onClick={() => voteForGulag(gulag.battleNumber, 1)}>Vote</button>
            </Card>
            </div>
        </div>
            <div style={{alignContent: "center"}} className="tooltip-button mb-9">
            <Tooltip className="tooltip-button-itself" style={{alignItems: "center",background:"black"}} content={
              (<>
              <div>
                {`Wager Period: ${(DateTime.fromJSDate(new Date(gulag.battleStartTime*1000))).toFormat("LLL dd yyyy")}-${(DateTime.fromJSDate(new Date(gulag.battleStartTime*1000))).plus({days:14}).toFormat("LLL dd yyyy")}`}
              </div>
              <div>
                {`Voting Period: ${(DateTime.fromJSDate(new Date(gulag.battleStartTime*1000))).plus({days:14}).toFormat("LLL dd yyyy")}-${(DateTime.fromJSDate(new Date(gulag.battleStartTime*1000))).plus({days:28}).toFormat("LLL dd yyyy")}`}
              </div>
              <div style={{display: "flex",
        justifyContent: "space-evenly",
        flexWrap: "wrap"}}>Total Wagered: {Math.round(gulag.battleTotalWagered*100)/100} ETH </div>
              </>)}>
      <IconButton style={{verticalAlign: "center"}}>
      <BsFillInfoCircleFill size={24} />
      </IconButton>
    </Tooltip>
            </div>
           <div>
          <NFT
            address={gulag.challengerNftAddress}
            chain={gulag.challengerNftChain}
            fetchMetadata
            tokenId={gulag.challengerNftTokenId} />
            <div className="form">
            <Card style={{
        display: "flex",
        justifyContent: "space-evenly",
        flexWrap: "wrap",
        marginBottom: "40px"
      }}>
          <button className="interact-button-wager" onClick={() => {
            setOpen(true)
            setWagerGetter(2)
          }}>Wager</button>
            <button className="interact-button-vote" onClick={() => voteForGulag(gulag.battleNumber, 2)}>Vote</button>
            </Card>
            </div>
           </div>
          </Card>
          <div className="form">
            
          </div>
                </CardGroup>

          </div>
                
              ))}
  </div>
  <div className="pagination text-black">
          <p className="text text-black">
    {page}/{totalPages}
          </p>
          <button
              onClick={prevPage}
              className={`text-black page ${page === 1 && "disabled"}`}
              style={{color:"black"}}
            >
              &larr;
            </button>
            <button
              onClick={() => setPage(1)}
              className={`text-black page ${page === 1 && "disabled"}`}
              style={{color:"black"}}
            >
              1
            </button>
            {gaps.before ? "..." : null}
            {gaps.paginationGroup.map((el:any) => (
              <button
                onClick={() => setPage(el)}
                key={el}
                className={`text-black page ${page === el ? "active" : ""}`}
                style={{color: "black"}}
              >
                {el}
              </button>
            ))}
            {gaps.after ? "..." : null}
            <button
              onClick={() => setPage(totalPages)}
              className={`text-black page ${page === totalPages && "disabled"}`}
              style={{color:"black"}}
            >
              {totalPages}
            </button>
            <button
              onClick={nextPage}
              className={` text-black page ${page === totalPages && "disabled"}`}
              style={{color:"black"}}
            >
              &rarr;
            </button>
            </div>
  </div>
  :[] }
  <style jsx>{`
        html,
        body {
          --main-color: #4b2eb3;
          --light-main-color:#b48cf9;
          --secondary-color:#b3d4fc;
          --redeem-color:#bbb812;
          padding: 0;
          margin: 0;
          font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
        }

        .tooltip {
          height: 50%;
          position: absolute;
        }

        .unknown {
          color: red;
        }

        
        .background {
            background-color: green;
            height: 150px;
            padding: 10px;
        }
  
        .card-group {
            box-shadow: 0 15px 25px rgba(129, 124, 124, 0.2);
            border-radius: 20px;
            backdrop-filter: blur(14px);
            background-color: rgba(255, 255, 255, 0.2);
            padding: 10px;
            text-align: center;
        }
  
        .card-group img {
            height: 60%;
        }
        .card-group-widget {
            box-shadow: 0 15px 25px rgba(129, 124, 124, 0.2);
            display: flex;
            border-radius: 20px;
            backdrop-filter: blur(14px);
            background-color: rgba(255, 255, 255, 0.2);
            padding: 10px;
            text-align: center;
            width: 15%;
        }
  
        .card-group-widget img {
            height: 60%;
        }
        .card-info {
          height:60%;
        }
        .card-group-widget-group {
            box-shadow: 0 15px 25px rgba(129, 124, 124, 0.2);
            justify-content: space-evenly;
            display: flex;
            border-radius: 20px;
            backdrop-filter: blur(14px);
            background-color: rgba(255, 255, 255, 0.2);
            padding: 10px;
            text-align: center;
            height: 15%;
        }
  
        .card-group-widget-group img {
            height: 45%;
        }
    
        
        body {
          min-height: 100vh;
          background: linear-gradient(159deg, rgba(193,97,255,1) 0%, rgba(158,243,255,1) 50%);
        }
        
        a {
          color: inherit;
          text-decoration: none;
        }
        
        * {
          box-sizing: border-box;
        }
        
        h1 {
          margin: 0;
        }
        
        header {
          /* max-width: 1000px; */
          padding: 20px;
          margin: 0 auto 60px;
        }
        
        /* header nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: Consolas, 'Courier New', Courier, monospace;
          font-weight: bold;
          color: white;
        } */
        header nav {
          box-shadow: 0 0 5px rgb(72, 72, 72);
          border-radius: 15px;
          padding: 1em 3;
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          align-items: center;
          /* width: 700px; */
          overflow: hidden;
          transition: .4s;
        }
        nav:hover{
            box-shadow: 0 0 8px rgb(177, 177, 177);
        }
        nav ul {
          display: flex;
          justify-content: space-between;
          padding: 0 1em;
        }
        
        header .account-info {
          display: flex;
          align-items: center;
        }
        
        header .account-info p {
          margin-right: 20px;
        }
        
        header .account-info .wallet-address {
          padding: 0 4px;
          border: 2px solid;
        }
        
        .account-button {
          display: flex;
          justify-content: center;
          align-items: center;
          background: white;
          padding: 6px 10px;
          border: 1px solid #ccc;
          border-radius: 10px;
        }
        .tooltip-button {
          display: flex;
          padding: 6px 10px;
          margin-bottom: 20px;
          justify-content: space-evenly;
          align-items: center;
          border-radius: 10px;
        }
        .tooltip-button-itself {
          display: flex;
          padding: 6px 10px;
          margin-bottom: 20px;
          justify-content: space-evenly;
          background:black;
          align-items: center;
          border-radius: 10px;
        }
        
        .account-button button {
          line-height: 1;
          background: transparent;
          padding: 0;
          border: none;
          cursor: pointer;
        }
        
        main {
          max-width: 680px;
          background: rgba(255, 255, 255, 0.904);
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 20px rgba(255,255,255,0.8);
          margin: auto;
        }
        
        main h1 {
          margin-bottom: 20px;
        }
        
        main h2 {
          max-width: 680px;
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 20px rgba(255,255,255,0.8);
          margin: auto;
        }
        
        .form-row {
          display: flex;
          flex-direction: column;
          text-align: left;
          margin: 0 0 20px;
        }
        
        .form-row > span {
          display: block;
          font-size: 18px;
          margin: 0 0 6px;
        }
        
        .form-row > span.hint-text {
          display: block;
          font-weight: 300;
          font-size: 14px;
          color: #666666;
          margin-top: 2px;
        }
        
        .form-row > input,
        .react-datetime-picker {
          box-sizing: border-box;
          padding: 10px;
          border: 2px solid var(--main-color);
          border-radius: 10px;
        }
        
        .form-row > input,
        .react-datetime-picker input {
          font-size: 18px;
          font-weight: 500;
          color: var(--main-color);
        }
        
        .react-datetime-picker__wrapper {
          border: none !important;
        }
        
        .form .submit-button {
          font-size: 24px;
          color: white;
          background: var(--main-color);
          font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
          padding: 8px 30px;
          border: 2px solid var(--main-color);
          border-radius: 20px;
          box-shadow: 0 5px 5px rgba(200,200,200,0.4);
          margin-top: 20px;
          cursor: pointer;
        }
        .form .interact-button-vote {
          font-size: 20px;
          color: black;
          background: var(--light-main-color);
          font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
          padding: 8px 20px;
          border: 2px solid black;
          border-radius: 20px;
          box-shadow: 0 5px 5px rgba(200,200,200,0.7);
          margin-top: 40px;
          margin-bottom: 20px;
          cursor: pointer;
        }
        .form .interact-button-wager {
          font-size: 20px;
          color: black;
          background: var(--secondary-color);
          font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
          padding: 8px 20px;
          border: 2px solid black;
          border-radius: 20px;
          box-shadow: 0 5px 5px rgba(200,200,200,0.7);
          margin-top: 40px;
          margin-bottom: 20px;
          cursor: pointer;
        }
        .form .interact-button-redeem {
          font-size: 18px;
          color: white;
          background: var(--redeem-color);
          font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
          padding: 8px 30px;
          border: 2px solid black;
          border-radius: 20px;
          box-shadow: 0 5px 5px rgba(200,200,200,0.7);
          margin-top: 20px;
          cursor: pointer;
        }
        .form .nft-center {
          font-size: 20px;
          color: black;
          flex-direction: column;
          flex: auto;
          justify-content: center;
          /* font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif; */
          padding: 8px 15px;
          border: 2px solid var(--main-color);
          border-radius: 20px;
          /* box-shadow: 0 5px 5px rgba(200,200,200,0.4); */
          /* margin-top: 20px; */
          /* cursor: pointer; */
        }
        
        .form .submit-button:hover {
          box-shadow: 0 5px 10px rgba(200,200,200,0.8);
        }
        
        .center {
          margin:auto;
          width: 63%;
          /* border: 3px grey; */
          /* padding: -8px -30px; */
          /* padding: 10px; */
        }
        
        .title {
          font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
          font-size: 30px;
        }
        
        .landing-page-container {
          display: inline-flex;
        }
        .landing-page-landing-page {
          width: 1500px;
          height: 6956px;
          overflow: clip;
          position: relative;
          background-color: white;
        }
        .landing-page-footer {
          top: 6612px;
          left: 0;
          width: 1502.16px;
          height: 351px;
          position: absolute;
        }
        .landing-page-b-g {
          top: 0%;
          left: 0%;
          right: 0%;
          bottom: 0%;
          position: absolute;
          background-color: rgba(21, 21, 21, 1);
        }
        .landing-page-dummy {
          top: 39.32%;
          left: 5.33%;
          color: rgba(162, 162, 162, 1);
          right: 70.11%;
          bottom: 37.89%;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: 24px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-designed-by-cr8tiv_y {
          top: calc(50% - 12px + 154.5px);
          left: 5.33%;
          color: rgba(152, 152, 152, 1);
          right: 80.49%;
          display: inline;
          opacity: 0.4;
          position: absolute;
          font-size: 12px;
          font-family: Poppins;
          line-height: 24px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-comapny-links {
          top: 69px;
          left: 618.97px;
          width: 170px;
          height: 235px;
          position: absolute;
        }
        .landing-page-company-links-about {
          top: 0;
          left: 0;
          width: 170px;
          height: 235px;
          position: relative;
        }
        .landing-page-coin-base-links {
          color: white;
          display: inline;
          font-size: 18px;
          font-family: Poppins;
          line-height: 30px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component {
          color: rgba(162, 162, 162, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          line-height: 30px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-home-about-us-blog-s {
          color: rgba(162, 162, 162, 1);
          display: inline;
          font-size: 12px;
          font-family: Poppins;
          line-height: 30px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-contact-us {
          top: 69px;
          left: 851.97px;
          width: 226px;
          height: 158px;
          position: absolute;
        }
        .landing-page-contact-us55254 {
          top: 0;
          left: 0;
          width: 226px;
          height: 158px;
          position: relative;
        }
        .landing-page-contact-us1 {
          color: white;
          display: inline;
          font-size: 18px;
          font-family: Poppins;
          line-height: 24px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component01 {
          color: rgba(162, 162, 162, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          line-height: 24px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-co {
          color: rgba(162, 162, 162, 1);
          display: inline;
          font-size: 12px;
          font-family: Poppins;
          line-height: 24px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-coin-base-instagram {
          top: calc(50% - 12px + -94.5px);
          left: 75.96%;
          color: white;
          right: 11.8%;
          display: inline;
          position: absolute;
          font-size: 18px;
          font-family: Poppins;
          line-height: 24px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-download-app {
          top: calc(50% - 12px + 86.5px);
          left: 56.72%;
          color: rgba(162, 162, 162, 1);
          right: 35.76%;
          display: inline;
          position: absolute;
          font-size: 12px;
          font-family: Poppins;
          line-height: 24px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component03 {
          top: 124px;
          left: 1220.97px;
          width: 70px;
          height: 70px;
          position: absolute;
        }
        .landing-page-testimonials {
          top: 3818px;
          left: -82px;
          width: 1663.64px;
          height: 1542.15px;
          position: absolute;
        }
        .landing-page-group211 {
          top: 0;
          left: 0;
          width: 1663.64px;
          height: 1542.15px;
          position: absolute;
        }
        .landing-page-we-love-developers {
          top: calc(50% - 13px + -54.08px);
          left: 33.72%;
          color: white;
          right: 33.7%;
          height: 26px;
          display: inline;
          position: absolute;
          font-size: 16px;
          text-align: center;
          font-family: Poppins;
          line-height: 40px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-line {
          top: 659px;
          left: 807px;
          width: 50px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 7px;
          border-radius: 9999px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-satisfied-cli {
          top: 547px;
          left: 669px;
          width: 327px;
          height: 84px;
          position: relative;
          text-align: center;
        }
        .landing-page-s {
          color: white;
          display: inline;
          font-size: 28px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          text-transform: uppercase;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-atisfied-clients-aro {
          color: white;
          display: inline;
          font-size: 28px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-testimonial {
          top: 1049px;
          left: 832.31px;
          width: 468.52px;
          height: 117px;
          position: absolute;
        }
        .landing-page-femi-from-nigeria {
          top: 17.7px;
          left: 49.02px;
          color: rgba(51, 51, 51, 1);
          width: 154px;
          height: 21.36px;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-wonderful-service-go {
          top: 63.17px;
          left: 49.02px;
          width: 419.5px;
          height: 36.09px;
          position: relative;
        }
        .landing-page-wonderful-service {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 12px;
          font-family: Poppins;
          font-weight: 700;
          line-height: 20px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-good-deal-and-very {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 12px;
          font-family: Poppins;
          line-height: 20px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-rates {
          top: 1122px;
          left: -82px;
          width: 1663.62px;
          height: 1128.41px;
          position: absolute;
        }
        .landing-page-b-g2 {
          top: 0;
          left: 0;
          width: 1663.62px;
          height: 1128.41px;
          position: absolute;
        }
        .landing-page-image1 {
          top: 43.73px;
          left: 81.81px;
          width: 1500px;
          height: 955.57px;
          position: absolute;
        }
        .landing-page-mask {
          top: 0%;
          left: 0%;
          right: 0%;
          bottom: 0%;
          position: absolute;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-info {
          top: 463px;
          left: 253px;
          width: 1159px;
          height: 367px;
          position: absolute;
        }
        .landing-page-rectangle287 {
          top: 0;
          left: 0;
          width: 1158px;
          filter: drop-shadow(0px 50px 100px rgba(0, 0, 0, 0.25));
          height: 367px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 30px;
          background-color: white;
        }
        .landing-page-line01 {
          top: 69.21%;
          left: 74.7%;
          right: 6.3%;
          bottom: 30.79%;
          position: absolute;
          outline-color: rgba(187, 187, 187, 1);
          outline-style: solid;
          outline-width: 1px;
        }
        .landing-page-we-love-developers01 {
          top: 33.79%;
          left: 74.7%;
          color: rgba(51, 51, 51, 1);
          right: 1.68%;
          bottom: 51.94%;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: 25px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers02 {
          top: 210px;
          left: 865px;
          width: 58px;
          height: 15px;
          position: relative;
        }
        .landing-page-component10 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 12px;
          font-family: Poppins;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-b-t-c {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 12px;
          font-family: Poppins;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers03 {
          top: 208px;
          left: 955px;
          width: 154.51px;
          height: 16.73px;
          position: relative;
        }
        .landing-page-component11 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 12px;
          font-family: Poppins;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-n-g-n {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 12px;
          font-family: Poppins;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-rectangle61 {
          top: 24.25%;
          left: 82.3%;
          right: 10.3%;
          bottom: 69.15%;
          position: absolute;
          box-sizing: border-box;
          border-radius: 5px;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-we-love-developers04 {
          top: 25.97%;
          left: 83.07%;
          color: white;
          right: 11.04%;
          bottom: 69.38%;
          display: inline;
          position: absolute;
          font-size: 8px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: 25px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers05 {
          top: 74.11%;
          left: 74.7%;
          color: rgba(51, 51, 51, 1);
          right: 1.68%;
          bottom: 11.61%;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: 25px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers06 {
          top: 127px;
          left: 170px;
          width: 184.28px;
          height: 29.96px;
          position: relative;
        }
        .landing-page-we-buy {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component12 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers07 {
          top: calc(50% - 14.98px + -46.52px);
          left: 39.98%;
          color: rgba(51, 51, 51, 1);
          right: 44.1%;
          height: 29.96px;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers08 {
          top: calc(50% - 14.98px + 51.48px);
          left: 39.98%;
          color: rgba(51, 51, 51, 1);
          right: 44.1%;
          height: 29.96px;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers09 {
          top: calc(50% - 14.98px + 117.48px);
          left: 39.98%;
          color: rgba(51, 51, 51, 1);
          right: 44.1%;
          height: 29.96px;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers10 {
          top: 286px;
          left: 620px;
          width: 184.28px;
          height: 29.96px;
          position: relative;
        }
        .landing-page-component13 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-eth {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers11 {
          top: calc(50% - 14.98px + -46.52px);
          left: 59.15%;
          color: rgba(51, 51, 51, 1);
          right: 24.93%;
          height: 29.96px;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers12 {
          top: calc(50% - 15px + -6.5px);
          left: 46.11%;
          color: rgba(51, 51, 51, 1);
          right: 37.56%;
          height: 30px;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers13 {
          top: 219px;
          left: 630px;
          width: 184.28px;
          height: 29.96px;
          position: relative;
        }
        .landing-page-component14 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-b-t-c1 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers14 {
          top: 231px;
          left: 170px;
          width: 184.28px;
          height: 29.96px;
          position: relative;
        }
        .landing-page-we-buy1 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Open Sans;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component15 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Open Sans;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers15 {
          top: calc(50% - 14.98px + -40.52px);
          left: 9.24%;
          color: rgba(51, 51, 51, 1);
          right: 86.38%;
          height: 29.96px;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers16 {
          top: 167.08px;
          left: 170.1px;
          width: 157px;
          height: 30px;
          position: relative;
        }
        .landing-page-we-sell {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component16 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 300;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component17 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers17 {
          top: calc(50% - 14.98px + 63.48px);
          left: 9.24%;
          color: rgba(51, 51, 51, 1);
          right: 86.38%;
          height: 29.96px;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Open Sans;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers18 {
          top: 271.23px;
          left: 170px;
          width: 147.66px;
          height: 29.96px;
          position: relative;
        }
        .landing-page-we-sell1 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Open Sans;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component18 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Open Sans;
          font-weight: 300;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component19 {
          color: rgba(51, 51, 51, 1);
          display: inline;
          font-size: 14px;
          font-family: Open Sans;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-container1 {
          display: inline-flex;
        }
        .landing-page-bitcoin1 {
          top: 126px;
          left: 64px;
          width: 27px;
          height: 28px;
          overflow: clip;
          position: absolute;
        }
        .landing-page-container2 {
          display: inline-flex;
        }
        .landing-page-bitcoin2 {
          top: 218px;
          left: 424px;
          width: 27px;
          height: 28px;
          overflow: clip;
          position: absolute;
        }
        .landing-page-container3 {
          display: inline-flex;
        }
        .landing-page-bank-building {
          top: 121px;
          left: 424px;
          width: 27px;
          height: 27px;
          overflow: clip;
          position: absolute;
        }
        .landing-page-scroll {
          top: 98px;
          left: 1128px;
          width: 6px;
          height: 233.79px;
          position: absolute;
        }
        .landing-page-line02 {
          top: -3499px;
          left: -6396px;
          width: 233.79px;
          height: 0;
          position: absolute;
          outline-color: rgba(229, 229, 229, 1);
          outline-style: solid;
          outline-width: 3px;
        }
        .landing-page-line03 {
          top: -3425.39px;
          left: -6396px;
          width: 86.57px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 3px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-line25 {
          top: 71px;
          left: 0;
          width: 1158px;
          height: 0;
          position: absolute;
          outline-color: rgba(187, 187, 187, 1);
          outline-style: solid;
          outline-width: 1px;
        }
        .landing-page-we-love-developers19 {
          top: calc(50% - 20px + -140.5px);
          left: 5.53%;
          right: 84.97%;
          height: 40px;
          display: inline;
          position: absolute;
          font-size: 18px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          font-family: Poppins;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-we-love-developers20 {
          top: calc(50% - 20px + -140.5px);
          left: 43.7%;
          right: 43.7%;
          height: 40px;
          display: inline;
          position: absolute;
          font-size: 18px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          font-family: Poppins;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-we-love-developers21 {
          top: calc(50% - 20px + -140.5px);
          left: 78.76%;
          right: 4.06%;
          height: 40px;
          display: inline;
          position: absolute;
          font-size: 18px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          font-family: Poppins;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-hero {
          top: 134px;
          left: -33px;
          width: 1567px;
          height: 816.31px;
          position: absolute;
        }
        .landing-page-b-g3 {
          top: 0;
          left: 0;
          width: 1567px;
          height: 816.31px;
          position: absolute;
        }
        .landing-page-rectangle284 {
          top: 0;
          left: 33px;
          width: 1500px;
          height: 750px;
          position: absolute;
          background-image: linear-gradient(174deg, rgba(253, 116, 155, 1) 2%, rgba(40, 26, 200, 1) 66%);
        }
        .landing-page-button {
          top: 427px;
          left: 215px;
          width: 157px;
          height: 54px;
          position: absolute;
        }
        .landing-page-rectangle286 {
          top: 0;
          left: 0;
          width: 157px;
          height: 54px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 100px;
          background-color: white;
        }
        .landing-page-field {
          top: calc(50% - 10px + 0px);
          left: 20.38%;
          right: 20.38%;
          height: 20px;
          display: inline;
          position: absolute;
          font-size: 14px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-we-love-developers22 {
          top: 142px;
          left: 215px;
          width: 529px;
          height: 180px;
          position: relative;
        }
        .landing-page-we-provide-easy-solu {
          color: white;
          display: inline;
          font-size: 40px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component20 {
          color: white;
          display: inline;
          font-size: 40px;
          font-family: Poppins;
          font-weight: 300;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-bitcoin-giftcard-f {
          color: white;
          display: inline;
          font-size: 40px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-component21 {
          color: white;
          display: inline;
          font-size: 40px;
          font-family: Poppins;
          font-weight: 300;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-money {
          color: white;
          display: inline;
          font-size: 40px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-coin-base-is-a-platfo {
          top: 343px;
          left: 215px;
          color: white;
          display: inline;
          position: absolute;
          font-size: 18px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-i-m-g {
          top: 60px;
          left: 817px;
          width: 628px;
          height: 519px;
          position: absolute;
          background-size: cover;
          background-image: url(https://uortjlczjmucmpaqqhqm.supabase.co/storage/v1/object/public/firejet-converted-images/6106/6ee1a9e8d435c321d2f1ba1069d0a90ad0b22bf2.webp);
        }
        .landing-page-form {
          top: 6467px;
          left: 473px;
          width: 554px;
          height: 54px;
          position: absolute;
        }
        .landing-page-button1 {
          top: 0;
          left: 397px;
          width: 157px;
          height: 54px;
          position: absolute;
        }
        .landing-page-rectangle2861 {
          top: 0;
          left: 0;
          width: 157px;
          height: 54px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 100px;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-field1 {
          top: calc(50% - 10px + 0px);
          left: 21.02%;
          color: white;
          right: 21.02%;
          height: 20px;
          display: inline;
          position: absolute;
          font-size: 14px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-form1 {
          top: 0;
          left: 0;
          width: 388px;
          height: 54px;
          position: absolute;
        }
        .landing-page-rectangle289 {
          top: 0;
          left: 0;
          width: 388px;
          height: 54px;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 1px;
          border-radius: 100px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-email {
          top: calc(50% - 10px + 0px);
          left: 0%;
          color: rgba(51, 51, 51, 1);
          right: 76.55%;
          height: 20px;
          display: inline;
          position: absolute;
          font-size: 14px;
          text-align: center;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-welcome {
          top: 921px;
          left: 136px;
          width: 1207px;
          height: 458px;
          position: absolute;
        }
        .landing-page-button2 {
          top: 404px;
          left: 665px;
          width: 157px;
          height: 54px;
          position: absolute;
        }
        .landing-page-rectangle2862 {
          top: 0;
          left: 0;
          width: 157px;
          height: 54px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 100px;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-field2 {
          top: calc(50% - 10px + 0px);
          left: 21.02%;
          color: white;
          right: 21.02%;
          height: 20px;
          display: inline;
          position: absolute;
          font-size: 14px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers23 {
          top: calc(50% - 32.5px + -196.5px);
          left: 55.1%;
          right: 18.81%;
          display: inline;
          position: absolute;
          font-size: 28px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          font-family: Poppins;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-we-love-developers24 {
          top: calc(50% - 134px + 6px);
          left: 55.1%;
          color: rgba(51, 51, 51, 1);
          right: 0%;
          height: 268px;
          display: inline;
          position: absolute;
          font-size: 16px;
          font-family: Poppins;
          line-height: 40px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-line04 {
          top: 56.92px;
          left: 669px;
          width: 50px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 7px;
          border-radius: 9999px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-layer2 {
          top: 14px;
          left: 0;
          width: 629px;
          height: 393px;
          position: absolute;
          background-image: url(https://uortjlczjmucmpaqqhqm.supabase.co/storage/v1/object/public/firejet-converted-images/6106/d292ee17cb3c07d70fee48e7c987b2cd7b008685.webp);
        }
        .landing-page-trade-from-anywhere {
          top: 2733px;
          left: -82px;
          width: 1663.62px;
          height: 625px;
          position: absolute;
        }
        .landing-page-b-g4 {
          top: 0;
          left: 0;
          width: 1663.62px;
          height: 519.75px;
          position: absolute;
        }
        .landing-page-rectangle {
          top: 0;
          left: 75.83px;
          width: 1512px;
          height: 488.94px;
          position: absolute;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-rectangle288 {
          top: 121px;
          left: 342px;
          width: 980px;
          filter: drop-shadow(0px 50px 100px rgba(0, 0, 0, 0.1));
          height: 504px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 30px;
          background-color: white;
        }
        .landing-page-we-love-developers25 {
          top: calc(50% - 21px + -96.5px);
          left: 40.45%;
          right: 40.43%;
          height: 42px;
          display: inline;
          position: absolute;
          font-size: 28px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          text-align: right;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-container1 {
          top: 314px;
          left: 538.03px;
          width: 262px;
          height: 226px;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 1px;
          border-radius: 15px;
          background-color: white;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-container2 {
          top: 314px;
          left: 863.03px;
          width: 262px;
          height: 226px;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 1px;
          border-radius: 15px;
          background-color: white;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-container4 {
          display: inline-flex;
        }
        .landing-page-bitcoin3 {
          top: 355.36px;
          left: 640.03px;
          width: 58px;
          height: 58px;
          overflow: clip;
          position: absolute;
        }
        .landing-page-bitcoin4 {
          top: 464px;
          left: 523px;
          color: rgba(51, 51, 51, 1);
          width: 294.07px;
          height: 51px;
          display: inline;
          position: absolute;
          font-size: 16px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-gift-cards {
          top: 466px;
          left: 848px;
          color: rgba(51, 51, 51, 1);
          width: 294.07px;
          height: 51px;
          display: inline;
          position: absolute;
          font-size: 16px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-gift-cards1 {
          top: 373px;
          left: 959.26px;
          width: 69.55px;
          height: 39.01px;
          position: absolute;
        }
        .landing-page-rectangle4 {
          top: 0;
          left: 0;
          width: 69.55px;
          height: 39.01px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 5px;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-rectangle5 {
          top: 23.89px;
          left: 23.78px;
          width: 22px;
          height: 3.5px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 5px;
          background-color: white;
        }
        .landing-page-rectangle51 {
          top: 14.94px;
          left: 17.78px;
          width: 33.99px;
          height: 5.41px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 5px;
          background-color: white;
        }
        .landing-page-line05 {
          top: 254px;
          left: 807px;
          width: 50px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 7px;
          border-radius: 9999px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-great-experience {
          top: 2204px;
          left: 218px;
          width: 1111px;
          height: 413px;
          position: absolute;
        }
        .landing-page-button3 {
          top: 348px;
          left: 0;
          width: 157px;
          height: 54px;
          position: absolute;
        }
        .landing-page-rectangle2863 {
          top: 0;
          left: 0;
          width: 157px;
          height: 54px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 100px;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-field3 {
          top: calc(50% - 10px + 0px);
          left: 21.02%;
          color: white;
          right: 21.02%;
          height: 20px;
          display: inline;
          position: absolute;
          font-size: 14px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers26 {
          top: calc(50% - 42px + -150.5px);
          left: 0%;
          right: 77.14%;
          display: inline;
          position: absolute;
          font-size: 28px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-we-love-developers27 {
          top: calc(50% - 76.5px + 36px);
          left: 0%;
          color: rgba(51, 51, 51, 1);
          right: 51.22%;
          height: 153px;
          display: inline;
          position: absolute;
          font-size: 16px;
          font-family: Poppins;
          line-height: 40px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-line06 {
          top: 116px;
          left: 4px;
          width: 50px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 7px;
          border-radius: 9999px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-component22 {
          top: 0;
          left: 597px;
          width: 514px;
          height: 413px;
          position: absolute;
          background-image: url(https://uortjlczjmucmpaqqhqm.supabase.co/storage/v1/object/public/firejet-converted-images/6106/4142df92a471ab80c21f40e2f9cc2e9102904613.webp);
        }
        .landing-page-blog {
          top: 3500px;
          left: 207px;
          width: 1087px;
          height: 543px;
          position: absolute;
        }
        .landing-page-we-love-developers28 {
          top: calc(50% - 13px + -149.5px);
          left: 25.02%;
          color: rgba(51, 51, 51, 1);
          right: 25.11%;
          height: 26px;
          display: inline;
          position: absolute;
          font-size: 16px;
          text-align: center;
          font-family: Poppins;
          line-height: 40px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers29 {
          top: calc(50% - 21px + -250.5px);
          left: 35.33%;
          right: 35.42%;
          height: 42px;
          display: inline;
          position: absolute;
          font-size: 28px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-line07 {
          top: 59px;
          left: 518px;
          width: 50px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 7px;
          border-radius: 9999px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-blog-blocks {
          top: 185px;
          left: 0;
          width: 1087px;
          height: 358px;
          position: absolute;
        }
        .landing-page-rectangle2891 {
          top: 36px;
          left: 0;
          width: 370px;
          height: 286px;
          position: absolute;
          box-sizing: border-box;
          border-color: rgba(136, 136, 136, 1);
          border-style: solid;
          border-width: 1px;
          border-radius: 15px;
          background-color: white;
        }
        .landing-page-dream-job-is-hard-to {
          top: calc(50% - 30px + -31px);
          left: 5.06%;
          color: rgba(136, 136, 136, 1);
          right: 70.19%;
          display: inline;
          position: absolute;
          font-size: 20px;
          font-family: Poppins;
          font-weight: 700;
          line-height: 30px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-rectangle291 {
          top: 36px;
          left: 717px;
          width: 370px;
          height: 286px;
          position: absolute;
          box-sizing: border-box;
          border-color: rgba(136, 136, 136, 1);
          border-style: solid;
          border-width: 1px;
          border-radius: 15px;
          background-color: white;
        }
        .landing-page-dream-job-is-hard-to1 {
          top: calc(50% - 30px + -37px);
          left: 69.83%;
          color: rgba(136, 136, 136, 1);
          right: 5.7%;
          display: inline;
          position: absolute;
          font-size: 20px;
          font-family: Poppins;
          font-weight: 700;
          line-height: 30px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-button3 {
          top: 252px;
          left: 759px;
          width: 105px;
          height: 36.11px;
          position: absolute;
        }
        .landing-page-rectangle2864 {
          top: 0;
          left: 0;
          width: 105px;
          height: 36.11px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 100px;
          background-color: rgba(136, 136, 136, 1);
        }
        .landing-page-field4 {
          top: calc(50% - 6.69px + 0px);
          left: 21.02%;
          color: white;
          right: 21.02%;
          height: 13.38px;
          display: inline;
          position: absolute;
          font-size: 9px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-group375 {
          top: 77px;
          left: 759px;
          width: 123px;
          height: 20px;
          position: absolute;
        }
        .landing-page-augs2018by-j {
          top: calc(50% - 10px + 0px);
          left: 0%;
          color: rgba(136, 136, 136, 1);
          right: 47.97%;
          display: inline;
          position: absolute;
          font-size: 10px;
          font-family: Poppins;
          line-height: 20px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-technology {
          top: calc(50% - 8.5px + -1.5px);
          left: 64.23%;
          color: rgba(136, 136, 136, 1);
          right: 0%;
          display: inline;
          position: absolute;
          font-size: 10px;
          font-family: Poppins;
          line-height: 17px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-rectangle1 {
          top: 0%;
          left: 55.28%;
          right: 43.9%;
          bottom: 25%;
          position: absolute;
          box-sizing: border-box;
          border-color: rgba(136, 136, 136, 1);
          border-style: solid;
          border-width: 1px;
          border-radius: 5px;
        }
        .landing-page-lorem-ipsum-dolor-si {
          top: 51.4%;
          left: 69.83%;
          color: rgba(136, 136, 136, 1);
          right: 5.43%;
          bottom: 27.65%;
          display: inline;
          position: absolute;
          font-size: 10px;
          font-family: Poppins;
          line-height: 18.5px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-rectangle290 {
          top: 0;
          left: 311px;
          width: 465px;
          filter: drop-shadow(0px 50px 100px rgba(0, 0, 0, 0.1));
          height: 358px;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 1px;
          border-radius: 15px;
          background-color: white;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-button1 {
          top: 274px;
          left: 370px;
          width: 127px;
          height: 43.68px;
          position: absolute;
        }
        .landing-page-rectangle2865 {
          top: 0;
          left: 0;
          width: 127px;
          height: 43.68px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 100px;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-field5 {
          top: calc(50% - 8.09px + 0px);
          left: 21.02%;
          color: white;
          right: 21.02%;
          height: 16.18px;
          display: inline;
          position: absolute;
          font-size: 11px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-button2 {
          top: 258px;
          left: 55px;
          width: 105px;
          height: 36.11px;
          position: absolute;
        }
        .landing-page-rectangle2866 {
          top: 0;
          left: 0;
          width: 105px;
          height: 36.11px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 100px;
          background-color: rgba(136, 136, 136, 1);
        }
        .landing-page-field6 {
          top: calc(50% - 6.69px + 0px);
          left: 21.02%;
          color: white;
          right: 21.02%;
          height: 13.38px;
          display: inline;
          position: absolute;
          font-size: 9px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-dream-job-is-hard-to2 {
          top: calc(50% - 39px + -57px);
          left: 34.04%;
          right: 37.63%;
          display: inline;
          position: absolute;
          font-size: 24px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          font-family: Poppins;
          font-weight: 700;
          line-height: 39px;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-group371 {
          top: 44px;
          left: 375px;
          width: 130px;
          height: 20px;
          position: absolute;
        }
        .landing-page-augs2018by-j1 {
          top: calc(50% - 10px + 0px);
          left: 0%;
          color: rgba(51, 51, 51, 1);
          right: 51.54%;
          display: inline;
          position: absolute;
          font-size: 10px;
          font-family: Poppins;
          line-height: 20px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-technology1 {
          top: calc(50% - 8.5px + -1.5px);
          left: 64.62%;
          color: rgba(51, 51, 51, 1);
          right: 0%;
          display: inline;
          position: absolute;
          font-size: 10px;
          font-family: Poppins;
          line-height: 17px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-rectangle2 {
          top: 0%;
          left: 56.15%;
          right: 43.08%;
          bottom: 25%;
          position: absolute;
          box-sizing: border-box;
          border-color: rgba(51, 51, 51, 1);
          border-style: solid;
          border-width: 1px;
          border-radius: 5px;
        }
        .landing-page-group372 {
          top: 83px;
          left: 55px;
          width: 145px;
          height: 20px;
          position: absolute;
        }
        .landing-page-augs2018by-j2 {
          top: calc(50% - 10px + 0px);
          left: 0%;
          color: rgba(136, 136, 136, 1);
          right: 62.07%;
          display: inline;
          position: absolute;
          font-size: 10px;
          font-family: Poppins;
          line-height: 20px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-technology2 {
          top: calc(50% - 8.5px + -1.5px);
          left: 54.48%;
          color: rgba(136, 136, 136, 1);
          right: 0%;
          display: inline;
          position: absolute;
          font-size: 10px;
          font-family: Poppins;
          line-height: 17px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-rectangle3 {
          top: 0%;
          left: 46.9%;
          right: 52.41%;
          bottom: 25%;
          position: absolute;
          box-sizing: border-box;
          border-color: rgba(136, 136, 136, 1);
          border-style: solid;
          border-width: 1px;
          border-radius: 5px;
        }
        .landing-page-lorem-ipsum-dolor-si1 {
          top: 49.16%;
          left: 34.04%;
          color: rgba(51, 51, 51, 1);
          right: 33.39%;
          bottom: 29.89%;
          display: inline;
          position: absolute;
          font-size: 12px;
          font-family: Poppins;
          line-height: 28px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-lorem-ipsum-dolor-si2 {
          top: 53.07%;
          left: 5.06%;
          color: rgba(136, 136, 136, 1);
          right: 62.37%;
          bottom: 25.98%;
          display: inline;
          position: absolute;
          font-size: 10px;
          font-family: Poppins;
          line-height: 18.5px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-love-developers30 {
          top: calc(50% - 32.5px + 2783.5px);
          left: 37.93%;
          right: 38.13%;
          display: inline;
          position: absolute;
          font-size: 28px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          text-align: right;
          font-family: Poppins;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-nullam-varius-portti {
          top: 91.01%;
          left: 37.27%;
          color: rgba(51, 51, 51, 1);
          right: 37.51%;
          bottom: 7.36%;
          display: inline;
          position: absolute;
          font-size: 16px;
          text-align: center;
          font-family: Poppins;
          line-height: 40px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-line08 {
          top: 6280.72px;
          left: 723px;
          width: 50px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 7px;
          border-radius: 9999px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-download-app1 {
          top: 5224px;
          left: -82px;
          width: 1663.62px;
          height: 903px;
          position: absolute;
        }
        .landing-page-b-g5 {
          top: 55px;
          left: 0;
          width: 1663.62px;
          height: 657.22px;
          position: absolute;
        }
        .landing-page-rectangle3 {
          top: 42px;
          left: 81.82px;
          width: 1500.01px;
          height: 615.22px;
          position: absolute;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-devices-iphone-x1 {
          top: calc(50% - 283px + 168.5px);
          left: calc(50% - 141.5px + -152.31px);
          width: 283px;
          height: 566px;
          position: absolute;
        }
        .landing-page-base {
          top: 0;
          left: 2.17px;
          width: 278.66px;
          height: 566px;
          position: absolute;
        }
        .landing-page-rectangle10 {
          top: 9.61%;
          left: 98.29%;
          right: 0%;
          bottom: 89.62%;
          position: absolute;
          background-color: rgba(20, 20, 20, 1);
        }
        .landing-page-rectangle101 {
          top: 9.61%;
          left: 0%;
          right: 98.29%;
          bottom: 89.62%;
          position: absolute;
          background-color: rgba(20, 20, 20, 1);
        }
        .landing-page-rectangle102 {
          top: 89.58%;
          left: 98.29%;
          right: 0%;
          bottom: 9.65%;
          position: absolute;
          background-color: rgba(20, 20, 20, 1);
        }
        .landing-page-rectangle103 {
          top: 89.58%;
          left: 0%;
          right: 98.29%;
          bottom: 9.65%;
          position: absolute;
          background-color: rgba(20, 20, 20, 1);
        }
        .landing-page-devices-iphone-x2 {
          top: calc(50% - 283px + 168.5px);
          left: calc(50% - 141.5px + 149.69px);
          width: 283px;
          height: 566px;
          position: absolute;
        }
        .landing-page-base1 {
          top: 0;
          left: 2.17px;
          width: 278.66px;
          height: 566px;
          position: absolute;
        }
        .landing-page-rectangle104 {
          top: 9.61%;
          left: 98.29%;
          right: 0%;
          bottom: 89.62%;
          position: absolute;
          background-color: rgba(20, 20, 20, 1);
        }
        .landing-page-rectangle105 {
          top: 9.61%;
          left: 0%;
          right: 98.29%;
          bottom: 89.62%;
          position: absolute;
          background-color: rgba(20, 20, 20, 1);
        }
        .landing-page-rectangle106 {
          top: 89.58%;
          left: 98.29%;
          right: 0%;
          bottom: 9.65%;
          position: absolute;
          background-color: rgba(20, 20, 20, 1);
        }
        .landing-page-rectangle107 {
          top: 89.58%;
          left: 0%;
          right: 98.29%;
          bottom: 9.65%;
          position: absolute;
          background-color: rgba(20, 20, 20, 1);
        }
        .landing-page-discover-place-near {
          top: 59.72%;
          left: 16.61%;
          right: 13.85%;
          bottom: 28.74%;
          display: inline;
          position: absolute;
          font-size: 18px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-we-make-it-simple-to {
          top: 71.55%;
          left: 19.43%;
          color: rgba(51, 51, 51, 1);
          right: 16.96%;
          bottom: 18.73%;
          display: inline;
          position: absolute;
          font-size: 11px;
          text-align: center;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-we-make-it-simple-to1 {
          top: 13.34%;
          left: 66.11%;
          right: 12.6%;
          bottom: 83.39%;
          display: inline;
          position: absolute;
          font-size: 12px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          text-align: center;
          font-family: Open Sans;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-we-love-developers31 {
          top: calc(50% - 32.5px + -419px);
          left: 42.02%;
          right: 42.17%;
          display: inline;
          position: absolute;
          font-size: 28px;
          background: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
          text-align: right;
          font-family: Poppins;
          font-weight: 700;
          line-height: 65px;
          margin-block-end: 0px;
          margin-block-start: 0px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-page-nullam-varius-portti1 {
          top: 11.3%;
          left: 38.53%;
          color: rgba(51, 51, 51, 1);
          right: 38.72%;
          bottom: 76.19%;
          display: inline;
          position: absolute;
          font-size: 16px;
          text-align: center;
          font-family: Poppins;
          line-height: 40px;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-line09 {
          top: 51.72px;
          left: 805px;
          width: 50px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 7px;
          border-radius: 9999px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-store {
          top: 197px;
          left: 729px;
          width: 193px;
          height: 36px;
          position: absolute;
        }
        .landing-page-app-store-logo1 {
          top: 0;
          left: 0;
          width: 85px;
          height: 36px;
          position: absolute;
          background-image: url(https://uortjlczjmucmpaqqhqm.supabase.co/storage/v1/object/public/firejet-converted-images/6106/8382f8477313edb09723841b7289a9ebc660fea8.webp);
        }
        .landing-page-get-it-on-google-play-badge-png-google-play-badge-png5051 {
          top: 4px;
          left: 95px;
          width: 98px;
          height: 28px;
          position: absolute;
          background-image: url(https://uortjlczjmucmpaqqhqm.supabase.co/storage/v1/object/public/firejet-converted-images/6106/5f0fca904298a2455a0c1625370f84595fa82e27.webp);
        }
        .landing-page-navigation {
          top: 37px;
          left: 105px;
          width: 1207px;
          height: 47px;
          position: absolute;
        }
        .landing-page-dropdown {
          top: 54px;
          left: 1088px;
          width: 142px;
          height: 73px;
          position: absolute;
        }
        .landing-page-selection1 {
          top: calc(50% - 8.14px + -8.79px);
          left: 8.67%;
          color: rgba(51, 51, 51, 1);
          right: 26.16%;
          height: 16.28px;
          display: inline;
          position: absolute;
          font-size: 12px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-selection1copy {
          top: calc(50% - 9.14px + 21.17px);
          left: 8.67%;
          color: white;
          right: 14.99%;
          height: 18.29px;
          display: inline;
          position: absolute;
          font-size: 12px;
          font-family: Poppins;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-nav {
          top: 20px;
          left: 412px;
          width: 426px;
          height: 26px;
          position: absolute;
        }
        .landing-page-contact {
          top: calc(50% - 10.5px + -2.5px);
          left: 57.98%;
          color: rgba(51, 51, 51, 1);
          right: 34.51%;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-contact1 {
          top: calc(50% - 10.5px + -2.5px);
          left: 81.22%;
          color: rgba(51, 51, 51, 1);
          right: 0%;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-plans {
          top: calc(50% - 10.5px + -2.5px);
          left: 26.06%;
          color: rgba(51, 51, 51, 1);
          right: 58.69%;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-about {
          top: calc(50% - 10.5px + -2.5px);
          left: 0%;
          color: rgba(51, 51, 51, 1);
          right: 89.91%;
          display: inline;
          position: absolute;
          font-size: 14px;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-indicator1 {
          top: 26px;
          left: 10px;
          width: 22px;
          height: 0;
          position: absolute;
          box-sizing: border-box;
          border-style: solid;
          border-width: 3px;
          border-radius: 9999px;
          border-image-slice: 1;
          border-image-source: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-field7 {
          top: calc(50% - 10px + -32.5px);
          left: 72.84%;
          color: rgba(51, 51, 51, 1);
          right: 15.91%;
          height: 20px;
          display: inline;
          position: absolute;
          font-size: 14px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        .landing-page-button4 {
          top: 0;
          left: 1150px;
          width: 157px;
          height: 54px;
          position: absolute;
        }
        .landing-page-rectangle285 {
          top: 0;
          left: 0;
          width: 157px;
          height: 54px;
          position: absolute;
          box-sizing: border-box;
          border-radius: 100px;
          background-image: linear-gradient(178deg, rgba(253, 116, 155, 1), rgba(40, 26, 200, 1));
        }
        .landing-page-field8 {
          top: calc(50% - 10px + 0px);
          left: 35.67%;
          color: white;
          right: 35.67%;
          height: 20px;
          display: inline;
          position: absolute;
          font-size: 14px;
          text-align: center;
          font-family: Poppins;
          font-weight: 700;
          line-height: normal;
          margin-block-end: 0px;
          margin-block-start: 0px;
        }
        *,
*::after,
*::before {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 10px;
  background-color: #151515;
}

.App {
  min-height: 100vh;
  color: white;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;
}

.pagination .text {
  opacity: 0.6;
  font-size: 1.5rem;
}

.page {
  color: white;
  height: 3rem;
  width: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: solid 0.2rem #4aa5be;
  background-color: transparent;
  border-radius: 0.7rem;
  cursor: pointer;
}

.page.active,
.page:hover {
  background-color: #4aa5be;
}

.page.disabled {
  background-color: transparent !important;
  cursor: not-allowed;
  opacity: 0.5;
}

h2 {
  margin-top: 4rem;
  text-align: center;
  text-transform: uppercase;
}

.App img {
  margin: 0 auto;
  height: 10rem;
  display: block;
}

.App .title {
  text-align: center;
  padding: 1rem;
  border-radius: 0.7rem;
  color: #61dafb;
  background-color: #61dafb0d;
  width: fit-content;
  margin: 0 auto;
  font-family: monospace;
}

.items {
  margin: auto;
  margin-top: 3rem;
  width: 60%;
}

.App .item {
  font-size: 1.6rem;
  display: flex;
  gap: 2rem;
  align-items: center;
  background-color: #222222;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 4rem;
}

.App .item p {
  margin-bottom: 0.4rem;
}

.App .item img {
  margin: 0;
  width: 8rem;
  height: 8rem;
  border-radius: 50%;
  background-color: #121212;
}

.App .item .name {
  text-transform: capitalize;
}

.App .item .username {
  opacity: 0.7;
  font-size: 1.4rem;
}

.App .item .job {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 1.3rem;
}

.App .item .status {
  font-size: 1.2rem;
  font-weight: bold;
  text-transform: uppercase;
  margin-top: 0.75rem;
  padding: 0.5rem 0.7rem;
  border-radius: 0.4rem;
  width: fit-content;
}

.App .item .status.success {
  background-color: rgba(67, 255, 76, 0.1);
  color: #c4ffc4;
}

.App .item .status.warn {
  background-color: rgb(195, 160, 35, 0.1);
  color: #ffd358;
}

.App .item .status.danger {
  background-color: rgb(239, 90, 90, 0.28);
  color: #ffe7e7;
}
        
      `}</style>
    </div>
  );
};

export default LiveGulags;
