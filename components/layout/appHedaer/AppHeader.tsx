import {EuiButtonIcon, useEuiTheme} from "@elastic/eui";
import Leading from "./Leading";
import {css} from "@emotion/css";

export default function AppHeader() {
    const {euiTheme} = useEuiTheme();

    return (
        <div className={"container-fluid"}>
            <div className={"row"}>
                <div className={css`
                  padding: ${euiTheme.size.base};
                `}>
                    <Leading/>
                </div>
                <div className={"col-md-6"}>1</div>
                <div className={"col-md-3 bg-black"}>1</div>
            </div>
        </div>
    )
}