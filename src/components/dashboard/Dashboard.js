import React, { useState, useEffect, Fragment } from 'react';
import Header from './Header';
import Table from './Table';
import Pagination from './Pagination';
import Loader from './Loader';
import Offline from './Offline';
import PriceForm from './PriceForm';
const { ipcRenderer } = window.require('electron');

const Dashboard = () => {
	const [prices, setPrices] = useState([]);
	const [priceType, setPriceType] = useState('');
	const [active, setActive] = useState({});
	const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
	const [offlinePrices, setOfflinePrices] = useState([]);

	const [items, setItems] = useState([]);
	const [isFetched, setIsFetched] = useState(false);
	const [activePage, setActivePage] = useState(1);
	const itemsPerPage = 10;
	const pageCount = items.length / itemsPerPage;

	const prev = () => {
		return activePage > 1 ? setActivePage(activePage - 1) : null;
	};

	const first = () => {
		return setActivePage(1);
	};

	const next = () => {
		return activePage < pageCount ? setActivePage(activePage + 1) : null;
	};

	const last = () => {
		return setActivePage(pageCount);
	};

	// opens the form and edits the active price
	const activeHandler = price => {
		setActive(price);
		setPriceType('edit');
	};

	// closes the form
	const closeHandler = () => {
		setPriceType('');
		setActive({});
	};

	// updates the edited price
	const editPrice = data => {
		const pricesCopy = [...prices];

		prices.map((item, index) => (item._id === data._id ? (pricesCopy[index] = data) : null));

		setPrices([...pricesCopy]);
	};

	const removePrice = data => {
		setPrices(prices.filter(price => price._id !== data));
	};

	// only runs once
	useEffect(() => {
		// event listener to check if there is internet connection
		window.addEventListener('online', checkOnlineStatus);
		window.addEventListener('offline', checkOnlineStatus);

		// call event function
		checkOnlineStatus();

		// remove event listeners to avoid memory leak
		return () => {
			window.removeEventListener('online', checkOnlineStatus);
			window.removeEventListener('offline', checkOnlineStatus);
		};
	}, []);

	// everytime the prices are changed, the stored prices file will also update
	useEffect(() => {
		if (prices.length) {
			storePrices().then(res => {
				setOfflinePrices(res);
			});
		}
	}, [prices]);

	// calls server to get all the daily NYSE prices
	const fetchData = () => {
		return new Promise((resolve, reject) => {
			ipcRenderer.send('get', null);
			ipcRenderer.on('get', (event, arg) => {
				resolve(arg);
			});
		});
	};

	// calls the server to store the daily prices to a file
	const storePrices = () => {
		return new Promise((resolve, reject) => {
			ipcRenderer.send('store_prices', prices);
			ipcRenderer.on('store_prices', (e, arg) => {
				resolve(arg);
			});
		});
	};

	// calls the server to get the daily prices file
	const getStoredPrices = () => {
		return new Promise((resolve, reject) => {
			ipcRenderer.send('get_store_prices', null);
			ipcRenderer.on('get_store_prices', (e, arg) => {
				resolve(arg);
			});
		});
	};

	const checkOnlineStatus = () => {
		// check if online
		// if online → fetch daily prices from the database
		if (navigator.onLine) {
			fetchData().then(res => {
				console.log('using the DB');
				setPrices(res);
				setIsFetched(true);
				setOnlineStatus(navigator.onLine);
			});
		}
		// if offline, get the stored daily prices
		else {
			getStoredPrices().then(res => {
				console.log('Using the local stored daily prices');
				setPrices(res);
				setIsFetched(true);
				setOnlineStatus(navigator.onLine);
			});
		}

		return !navigator.onLine ? setPriceType('') : null;
	};

	return (
		<Fragment>
			{isFetched ? (
				<div className='bg-gray-200 h-screen flex flex-col'>
					{!onlineStatus ? <Offline /> : null}

					{priceType !== '' ? (
						<PriceForm
							close={() => closeHandler()}
							type={priceType}
							price={active}
							addPrice={data => setPrices([data, ...prices])}
							editPrice={data => editPrice(data)}
							removePrice={data => removePrice(data)}
						/>
					) : null}

					<Header add={() => setPriceType('add')} online={onlineStatus} />
					<Table prices={onlineStatus ? prices : offlinePrices} edit={price => activeHandler(price)} active={active._id} online={onlineStatus} />
					<Pagination
						items={items}
						pageCount={pageCount}
						first={() => first()}
						prev={() => prev()}
						next={() => next()}
						last={() => last()}
						setActive={e => setActivePage(e)}
						active={activePage}
					/>
				</div>
			) : (
				<Loader />
			)}
		</Fragment>
	);
};

export default Dashboard;
