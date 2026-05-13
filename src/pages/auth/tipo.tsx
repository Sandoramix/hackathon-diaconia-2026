import {useRouter} from "next/router";
import type {ReactNode} from "react";

import {getAuthHeaderLayout} from "~/layouts/AuthHeaderLayout";
import type {NextPageWithLayout} from "../_app";
import {TutorIconBtn} from "../../components/icons/TutorIconBtn";
import {UserIconBtn} from "../../components/icons/UserIconBtn";

const TipoPage: NextPageWithLayout = function TipoPage() {
    const router = useRouter();

    return (
        <div className="space-y-10">
            <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Chi sei?</h1>
            </div>
            <div className="flex gap-10 justify-center">
                <UserIconBtn
                    onClick={() => router.push("/auth/accedi?tipo=studente")}
                />
                <TutorIconBtn
                    onClick={() => router.push("/auth/accedi?tipo=tutor")}
                />
            </div>
        </div>
    );
};

TipoPage.getLayout = (page: ReactNode) => getAuthHeaderLayout(page);

export default TipoPage;
