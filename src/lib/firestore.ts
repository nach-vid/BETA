
import { doc, setDoc, getDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { DayLog } from "@/app/log-day/page";
import { format } from "date-fns";

const sanitizeDataForFirestore = (data: any): any => {
    if (data === undefined) {
        return null;
    }
    if (data === null) {
        return null;
    }
    if (data instanceof Date) {
        return Timestamp.fromDate(data);
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitizeDataForFirestore(item));
    }
    if (typeof data === 'object') {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                if (value !== undefined) {
                    newData[key] = sanitizeDataForFirestore(value);
                } else {
                    newData[key] = null;
                }
            }
        }
        return newData;
    }
    return data;
};

const convertTimestampsToDates = (data: any): any => {
    if (data instanceof Timestamp) {
        return data.toDate();
    }
    if (Array.isArray(data)) {
        return data.map(convertTimestampsToDates);
    }
    if (typeof data === 'object' && data !== null) {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            newData[key] = convertTimestampsToDates(data[key]);
        }
        return newData;
    }
    return data;
};


export async function saveDayLog(userId: string, dayLog: DayLog): Promise<void> {
    const dayKey = format(new Date(dayLog.date), 'yyyy-MM-dd');
    const docRef = doc(db, "users", userId, "tradeLogs", dayKey);
    
    const dataToSave = sanitizeDataForFirestore(dayLog);

    await setDoc(docRef, dataToSave, { merge: true });
}

export async function getDayLog(userId: string, date: Date): Promise<DayLog | null> {
    const dayKey = format(date, 'yyyy-MM-dd');
    const docRef = doc(db, "users", userId, "tradeLogs", dayKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return convertTimestampsToDates(data) as DayLog;
    } else {
        return null;
    }
}

export async function getTradeLogs(userId: string): Promise<DayLog[]> {
    const collectionRef = collection(db, "users", userId, "tradeLogs");
    const querySnapshot = await getDocs(collectionRef);
    
    const logs: DayLog[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push(convertTimestampsToDates(data) as DayLog);
    });
    
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

    