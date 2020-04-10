import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { Frame, Cover, Title, Label, Error, Input, Button, HeaderAuth as Header, FooterAuth as Footer } from 'ts/component';
import { I, Storage, translate, C } from 'ts/lib';
import { commonStore, authStore } from 'ts/store';
import { observer } from 'mobx-react';

interface Props extends RouteComponentProps<any> {};
interface State {
	error: string;
};

@observer
class PageAuthInvite extends React.Component<Props, State> {

	ref: any;

	state = {
		error: ''
	};
	
	constructor (props: any) {
		super(props);

		this.onSubmit = this.onSubmit.bind(this);
	};
	
	render () {
		const { coverId, coverImg } = commonStore;
		const { error } = this.state;
		
        return (
			<div>
				<Cover type={I.CoverType.Image} num={coverId} image={coverImg} />
				<Header />
				<Footer />
				
				<Frame>
					<Title text={translate('authInviteTitle')} />
					<Label text={translate('authInviteLabel')} />
					<Error text={error} />
							
					<form className="form" onSubmit={this.onSubmit}>
						<Input ref={(ref: any) => this.ref = ref} type="password" placeHolder={translate('authInvitePlaceholder')} />
						<div className="buttons">
							<Button type="input" text={translate('authInviteLogin')} className="orange" />
						</div>
					</form>
				</Frame>
			</div>
		);
	};

	componentDidMount () {
		this.ref.focus();
	};
	
	componentDidUpdate () {
		this.ref.focus();
	};

	onSubmit (e: any) {
		e.preventDefault();
		
		const { match, history } = this.props;
		
		authStore.codeSet(this.ref.getValue());
		history.push('/auth/setup/' + match.params.id);	
	};
	
};

export default PageAuthInvite;