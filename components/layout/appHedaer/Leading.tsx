import {EuiButtonIcon, EuiIcon, EuiToken} from "@elastic/eui";
import {useEuiTheme} from '@elastic/eui';

export default function Leading() {
    const {euiTheme} = useEuiTheme();

    return (
        <div className={"flex"}>
            <EuiButtonIcon
                css={{
                    marginRight: euiTheme.size.base,
                }}

                aria-label="Help" iconType={"/icons/user.svg"} size={"m"} color={"text"}/>
            <EuiButtonIcon aria-label="Help" iconType={"/icons/settings.svg"} size={"m"} color={"text"}/>
        </div>
    )
}