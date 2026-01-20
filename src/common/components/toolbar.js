import { Localized, useLocalization } from "@fluent/react";
import cx from "classnames";
import React, { useContext, useEffect, useRef, useState } from "react";
import { ReaderContext } from "../reader";
import CustomSections from "./common/custom-sections";
import { IconColor20 } from "./common/icons";

import IconCheck12 from "../../../res/icons/12/check.svg";
import IconImage from "../../../res/icons/20/annotate-area.svg";
import IconEraser from "../../../res/icons/20/annotate-eraser.svg";
import IconHighlight from "../../../res/icons/20/annotate-highlight.svg";
import IconInk from "../../../res/icons/20/annotate-ink.svg";
import IconNote from "../../../res/icons/20/annotate-note.svg";
import IconText from "../../../res/icons/20/annotate-text.svg";
import IconUnderline from "../../../res/icons/20/annotate-underline.svg";
import IconDownload from "../../../res/icons/20/download.svg";
import IconFormatText from "../../../res/icons/20/format-text.svg";
import IconFind from "../../../res/icons/20/magnifier.svg";
import IconSidebar from "../../../res/icons/20/sidebar.svg";
import IconTranslate from "../../../res/icons/20/translate.svg";
import IconZoomIn from "../../../res/icons/20/zoom-in.svg";
import IconZoomOut from "../../../res/icons/20/zoom-out.svg";
import IconChevronDown8 from "../../../res/icons/8/chevron-8.svg";

const TOOL_OPTIONS = [
	{
		type: "highlight",
		icon: IconHighlight,
		localizationId: "reader-toolbar-highlight",
	},
	{
		type: "underline",
		icon: IconUnderline,
		localizationId: "reader-toolbar-underline",
	},
	{
		type: "note",
		icon: IconNote,
		localizationId: "reader-toolbar-note",
	},
	{
		type: "text",
		icon: IconText,
		localizationId: "reader-toolbar-text",
		pdfOnly: true,
	},
	{
		type: "image",
		icon: IconImage,
		localizationId: "reader-toolbar-area",
		pdfOnly: true,
	},
	{
		type: "ink",
		icon: IconInk,
		localizationId: "reader-toolbar-draw",
		pdfOnly: true,
	},
];

function useDropdownAutoClose(ref, isOpen, onClose) {
	useEffect(() => {
		if (!isOpen) {
			return;
		}
		function handlePointerDown(event) {
			if (!ref.current?.contains(event.target)) {
				onClose();
			}
		}
		function handleKeydown(event) {
			if (event.key === "Escape") {
				onClose();
			}
		}
		// 点击iframe内部也关闭下拉菜单
		function handleIframeClick() {
			onClose();
		}
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeydown);

		// 获取所有iframe并监听其点击事件
		const iframes = document.querySelectorAll("iframe");
		const cleanupFns = [];
		iframes.forEach((iframe) => {
			try {
				const iframeDoc =
					iframe.contentDocument || iframe.contentWindow?.document;
				if (iframeDoc) {
					iframeDoc.addEventListener(
						"pointerdown",
						handleIframeClick
					);
					cleanupFns.push(() => {
						iframeDoc.removeEventListener(
							"pointerdown",
							handleIframeClick
						);
					});
				}
			} catch (e) {
				// 跨域iframe无法访问，忽略
			}
		});

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeydown);
			cleanupFns.forEach((fn) => fn());
		};
	}, [isOpen, onClose, ref]);
}

function Toolbar(props) {
	const pageInputRef = useRef();
	const sidebarDropdownRef = useRef();
	const toolDropdownRef = useRef();
	const translationDropdownRef = useRef();
	const downloadDropdownRef = useRef();
	const [isSidebarDropdownOpen, setIsSidebarDropdownOpen] = useState(false);
	const [isToolPaletteOpen, setIsToolPaletteOpen] = useState(false);
	const [isTranslationMenuOpen, setIsTranslationMenuOpen] = useState(false);
	const translationServices = Array.isArray(props.translateList)
		? props.translateList
		: [];
	const hasTranslation =
		props.showTranslationControls && translationServices.length > 0;
	const downloadHasDropdown =
		props.isEnglishDocument !== false &&
		translationServices.length > 0 &&
		props.showTranslationControls;
	const [selectedTranslationService, setSelectedTranslationService] =
		useState(() => translationServices[0]?.key || null);
	const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
	const { platform } = useContext(ReaderContext);

	const { l10n } = useLocalization();

	useDropdownAutoClose(sidebarDropdownRef, isSidebarDropdownOpen, () =>
		setIsSidebarDropdownOpen(false)
	);
	useDropdownAutoClose(toolDropdownRef, isToolPaletteOpen, () =>
		setIsToolPaletteOpen(false)
	);
	useDropdownAutoClose(translationDropdownRef, isTranslationMenuOpen, () =>
		setIsTranslationMenuOpen(false)
	);
	useDropdownAutoClose(downloadDropdownRef, isDownloadMenuOpen, () =>
		setIsDownloadMenuOpen(false)
	);

	useEffect(() => {
		if (!hasTranslation) {
			setSelectedTranslationService(null);
			setIsTranslationMenuOpen(false);
			return;
		}
		setSelectedTranslationService((prev) => {
			if (
				prev &&
				translationServices.some((service) => service.key === prev)
			) {
				return prev;
			}
			// Try loading from localStorage
			try {
				const savedServiceId = localStorage.getItem(
					"reader-translation-service-id"
				);
				if (
					savedServiceId &&
					translationServices.some(
						(service) => service.key === savedServiceId
					)
				) {
					return savedServiceId;
				}
			} catch (e) {
				// Ignore localStorage errors
			}
			return translationServices[0]?.key || null;
		});
	}, [hasTranslation, props.translateList]);

	function handleToolColorClick(event) {
		let br = event.currentTarget.getBoundingClientRect();
		props.onOpenColorContextMenu({ x: br.left, y: br.bottom });
	}

	function handleFindClick(event) {
		props.onToggleFind();
	}

	function handleToolClick(type) {
		if (props.tool.type === type) {
			type = "pointer";
		}
		if (type === "ink" && ["ink", "eraser"].includes(props.tool.type)) {
			type = "pointer";
		}
		props.onChangeTool({ type });
		setIsToolPaletteOpen(false);
	}

	function handlePageNumberKeydown(event) {
		if (event.key === "Enter") {
			props.onChangePageNumber(event.target.value);
		}
	}

	function handlePageNumberBlur(event) {
		if (event.target.value != (props.pageLabel ?? props.pageIndex + 1)) {
			props.onChangePageNumber(event.target.value);
		}
	}

	function handleSidebarDropdownToggle() {
		setIsSidebarDropdownOpen((open) => !open);
	}

	function handleSidebarOptionSelect(option) {
		setIsSidebarDropdownOpen(false);
		if (!props.sidebarOpen) {
			props.onToggleSidebar(true);
		}
		if (props.sidebarView !== option) {
			props.onChangeSidebarView(option);
		}
	}

	function handleToggleSidebar() {
		if (props.sidebarOpen) {
			// 关闭侧边栏
			props.onToggleSidebar(false);
		} else {
			// 打开侧边栏并切换到缩略图视图
			props.onToggleSidebar(true);
			if (props.type === "pdf" && props.sidebarView !== "thumbnails") {
				props.onChangeSidebarView("thumbnails");
			}
		}
	}

	function handleToolPaletteToggle() {
		if (props.readOnly) {
			return;
		}
		setIsToolPaletteOpen((open) => {
			let next = !open;
			if (next) {
				setIsTranslationMenuOpen(false);
				setIsDownloadMenuOpen(false);
			}
			return next;
		});
	}

	function handleTranslationAction() {
		if (props.translationActive) {
			const selectedService = selectedTranslationService
				? translationServices.find(
						(service) => service.key === selectedTranslationService
				  ) || { key: selectedTranslationService }
				: null;
			props.onStopTranslation?.(selectedService);
			setIsTranslationMenuOpen(false);
			return;
		}
		handleStartTranslation();
	}

	function handleTranslationMenuToggle() {
		setIsTranslationMenuOpen((prev) => !prev);
	}

	function handleStartTranslation() {
		if (
			!hasTranslation ||
			!selectedTranslationService ||
			props.translationLoading
		) {
			return;
		}
		let selectedItem = translationServices.find(
			(service) => service.key === selectedTranslationService
		);
		if (!selectedItem) {
			return;
		}
		setIsTranslationMenuOpen(false);
		props.onStartTranslation?.(selectedItem, {
			pagesCount: props.pagesCount,
		});
	}

	function handleSelectTranslationService(serviceKey) {
		setSelectedTranslationService(serviceKey);
		try {
			localStorage.setItem("reader-translation-service-id", serviceKey);
		} catch (e) {
			// Ignore localStorage errors
		}
	}

	function handleDownloadMenuToggle() {
		if (!downloadHasDropdown) {
			handleDownload("original");
			return;
		}
		setIsDownloadMenuOpen((open) => {
			let next = !open;
			if (next) {
				setIsToolPaletteOpen(false);
				setIsTranslationMenuOpen(false);
			}
			return next;
		});
	}

	function handleDownload(option) {
		setIsDownloadMenuOpen(false);
		if (option === "translation") {
			props.onDownloadTranslation?.();
		} else {
			props.onDownloadOriginal?.();
		}
	}

	const sidebarSelection = props.sidebarView;
	// 菜单顺序：缩略图、批注、大纲
	const sidebarOptions = [
		props.type === "pdf" && {
			id: "thumbnails",
			label: l10n.getString("reader-thumbnails"),
		},
		{ id: "annotations", label: l10n.getString("reader-annotations") },
		{ id: "outline", label: l10n.getString("reader-outline") },
	].filter(Boolean);

	const filteredToolOptions = TOOL_OPTIONS.filter(
		(option) => !(option.pdfOnly && props.type !== "pdf")
	);
	const displayToolType =
		props.tool.type === "eraser" ? "ink" : props.tool.type;
	const activeToolOption =
		filteredToolOptions.find((option) => option.type === displayToolType) ||
		filteredToolOptions[0];
	const ActiveToolIcon = activeToolOption?.icon || IconHighlight;
	const translationEngaged =
		props.translationActive || props.translationLoading;
	const translationLabel = props.translationLoading
		? l10n.getString("reader-translation-loading")
		: props.translationActive
		? l10n.getString("reader-translation-stop")
		: l10n.getString("reader-translation-full");

	return (
		<div className="toolbar" data-tabstop={1} role="application">
			<div className="start">
				<div className="sidebar-controls">
					{/* 侧边栏显示/隐藏按钮 */}
					<button
						type="button"
						id="sidebarToggle"
						className={cx("toolbar-button sidebar-icon-button", {
							active: props.sidebarOpen,
						})}
						title={l10n.getString("reader-toggle-sidebar")}
						tabIndex={-1}
						onClick={handleToggleSidebar}
					>
						<IconSidebar />
					</button>
					{/* 菜单下拉按钮 */}
					<div className="sidebar-dropdown" ref={sidebarDropdownRef}>
						<button
							type="button"
							className={cx(
								"toolbar-button sidebar-menu-trigger",
								{
									active: isSidebarDropdownOpen,
								}
							)}
							tabIndex={-1}
							onClick={handleSidebarDropdownToggle}
							aria-haspopup="menu"
							aria-expanded={isSidebarDropdownOpen}
						>
							<IconChevronDown8
								className={cx("sidebar-dropdown-chevron", {
									open: isSidebarDropdownOpen,
								})}
							/>
						</button>
						{isSidebarDropdownOpen && (
							<div className="sidebar-dropdown-menu" role="menu">
								{sidebarOptions.map((option) => (
									<button
										type="button"
										role="menuitem"
										key={option.id}
										className="sidebar-dropdown-option"
										onClick={() =>
											handleSidebarOptionSelect(option.id)
										}
									>
										<span>{option.label}</span>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
				{/* <button
					id="navigateBack"
					className="toolbar-button navigateBack"
					title={l10n.getString("general-back")}
					tabIndex={-1}
					disabled={!props.enableNavigateBack}
					onClick={props.onNavigateBack}
				>
					<IconChevronLeft />
				</button> */}
				{/* <div className="divider" /> */}
				{["pdf", "epub"].includes(props.type) && (
					<React.Fragment>
						{/* <button
							className="toolbar-button pageUp"
							title={l10n.getString("reader-previous-page")}
							id="previous"
							tabIndex={-1}
							disabled={!props.enableNavigateToPreviousPage}
							onClick={props.onNavigateToPreviousPage}
							aria-describedby="numPages"
						>
							<IconChevronUp />
						</button>
						<button
							className="toolbar-button pageDown"
							title={l10n.getString("reader-next-page")}
							id="next"
							tabIndex={-1}
							disabled={!props.enableNavigateToNextPage}
							onClick={props.onNavigateToNextPage}
							aria-describedby="numPages"
						>
							<IconChevronDown />
						</button> */}
					</React.Fragment>
				)}
				{/* {["pdf", "epub"].includes(props.type) && (
					<input
						ref={pageInputRef}
						type="input"
						id="pageNumber"
						className="toolbar-text-input"
						title={l10n.getString(
							props.type === "pdf" || props.usePhysicalPageNumbers
								? "reader-page"
								: "reader-location"
						)}
						defaultValue=""
						size="4"
						min="1"
						tabIndex={-1}
						autoComplete="off"
						onKeyDown={handlePageNumberKeydown}
						onBlur={handlePageNumberBlur}
					/>
				)} */}
				{/* {props.pageLabel && (
					<span id="numPages">
						&nbsp;
						<div>
							{!(
								props.type === "pdf" &&
								props.pageIndex + 1 == props.pageLabel
							) && props.pageIndex + 1}{" "}
							/ {props.pagesCount}
						</div>
					</span>
				)} */}
			</div>
			<div className="center tools">
				<div className="zoom-group">
					<button
						id="zoomOut"
						className="toolbar-button zoomOut"
						title={l10n.getString("reader-zoom-out")}
						tabIndex={-1}
						disabled={!props.enableZoomOut}
						onClick={props.onZoomOut}
					>
						<IconZoomOut />
					</button>
					<button
						id="zoomIn"
						className="toolbar-button zoomIn"
						title={l10n.getString("reader-zoom-in")}
						tabIndex={-1}
						disabled={!props.enableZoomIn}
						onClick={props.onZoomIn}
					>
						<IconZoomIn />
					</button>
				</div>
				{hasTranslation && (
					<div
						className={cx("translation-dropdown", {
							active: translationEngaged,
						})}
						ref={translationDropdownRef}
					>
						<div
							className={cx("translation-button-group", {
								active:
									translationEngaged || isTranslationMenuOpen,
							})}
						>
							<button
								type="button"
								className={cx("translation-action-button", {
									single: translationEngaged,
								})}
								tabIndex={-1}
								onClick={handleTranslationAction}
								disabled={props.translationLoading}
							>
								<IconTranslate />
								<span>{translationLabel}</span>
							</button>
							{!translationEngaged && (
								<button
									type="button"
									className="translation-menu-trigger"
									tabIndex={-1}
									onClick={handleTranslationMenuToggle}
									aria-haspopup="menu"
									aria-expanded={isTranslationMenuOpen}
								>
									<IconChevronDown8 />
								</button>
							)}
						</div>
						{isTranslationMenuOpen && (
							<div
								className="translation-dropdown-menu"
								role="menu"
							>
								{!translationEngaged && (
									<>
										<div className="translation-dropdown-label">
											{l10n.getString(
												"reader-translation-provider"
											)}
										</div>
										<div className="translation-dropdown-options">
											{translationServices.map(
												(service) => (
													<button
														type="button"
														key={service.key}
														className={cx(
															"translation-option",
															{
																active:
																	selectedTranslationService ===
																	service.key,
															}
														)}
														onClick={() =>
															handleSelectTranslationService(
																service.key
															)
														}
													>
														<span>
															{service.value ??
																service.key}
														</span>
														{selectedTranslationService ===
															service.key && (
															<IconCheck12 className="translation-option-icon" />
														)}
													</button>
												)
											)}
										</div>
									</>
								)}

								{!translationEngaged && (
									<button
										type="button"
										className="translation-start-button"
										onClick={handleStartTranslation}
										disabled={
											!selectedTranslationService ||
											props.translationLoading
										}
									>
										{l10n.getString(
											"reader-translation-start"
										)}
									</button>
								)}
							</div>
						)}
					</div>
				)}
				{!props.readOnly && (
					<div
						className={cx("tool-dropdown", {
							disabled: props.readOnly,
						})}
						ref={toolDropdownRef}
					>
						<button
							type="button"
							className="toolbar-button tool-dropdown-toggle"
							tabIndex={-1}
							disabled={props.readOnly}
							onClick={handleToolPaletteToggle}
							aria-haspopup="menu"
							aria-expanded={isToolPaletteOpen}
						>
							<ActiveToolIcon />
							<IconChevronDown8 />
						</button>
						{isToolPaletteOpen && (
							<div className="tool-palette" role="menu">
								<div className="tool-palette-row">
									{filteredToolOptions.map((option) => (
										<Localized
											key={option.type}
											id={option.localizationId}
											attrs={{
												title: true,
												"aria-description": true,
											}}
										>
											<button
												type="button"
												tabIndex={-1}
												className={cx(
													"toolbar-button tool-option",
													{
														active:
															displayToolType ===
															option.type,
													}
												)}
												disabled={props.readOnly}
												onClick={() =>
													handleToolClick(option.type)
												}
											>
												<option.icon />
											</button>
										</Localized>
									))}
									<button
										type="button"
										tabIndex={-1}
										className="toolbar-button color-chip-button"
										disabled={
											props.readOnly ||
											["pointer", "hand"].includes(
												props.tool.type
											)
										}
										title={l10n.getString(
											"reader-pick-color"
										)}
										onClick={handleToolColorClick}
									>
										{props.tool.type === "eraser" ? (
											<IconEraser />
										) : (
											<IconColor20
												color={
													props.tool.color ||
													([
														"pointer",
														"hand",
													].includes(
														props.tool.type
													) &&
														"transparent")
												}
											/>
										)}
										<IconChevronDown8 />
									</button>
								</div>
							</div>
						)}
					</div>
				)}
				<button
					id="appearance"
					className={cx("toolbar-button appearance-toggle", {
						active: props.appearancePopup,
					})}
					title={l10n.getString("reader-appearance")}
					tabIndex={-1}
					onClick={props.onToggleAppearancePopup}
				>
					<IconFormatText />
				</button>
				<div className="download-dropdown" ref={downloadDropdownRef}>
					<button
						type="button"
						className={cx("toolbar-button download-toggle", {
							active: isDownloadMenuOpen,
						})}
						tabIndex={-1}
						onClick={handleDownloadMenuToggle}
						aria-haspopup={downloadHasDropdown ? "menu" : undefined}
						aria-expanded={
							downloadHasDropdown && isDownloadMenuOpen
						}
					>
						<IconDownload />
						{downloadHasDropdown && <IconChevronDown8 />}
					</button>
					{downloadHasDropdown && isDownloadMenuOpen && (
						<div className="download-dropdown-menu" role="menu">
							<button
								type="button"
								onClick={() => handleDownload("translation")}
							>
								{l10n.getString("reader-download-translation")}
							</button>
							<button
								type="button"
								onClick={() => handleDownload("original")}
							>
								{l10n.getString("reader-download-original")}
							</button>
						</div>
					)}
				</div>
			</div>
			<div className="end">
				{props.translationActive && (
					<div className="translation-settings toolbar-item">
						{(props.showOriginalEnabled ?? true) && (
							<label className="toggle-switch-label">
								<span>跟随滚动</span>
								<div className="toggle-switch">
									<input
										type="checkbox"
										checked={
											props.syncScrollEnabled ?? true
										}
										onChange={props.onToggleSyncScroll}
									/>
									<span className="toggle-slider"></span>
								</div>
							</label>
						)}
						<label className="toggle-switch-label">
							<span>展示原文</span>
							<div className="toggle-switch">
								<input
									type="checkbox"
									checked={props.showOriginalEnabled ?? true}
									onChange={props.onToggleShowOriginal}
								/>
								<span className="toggle-slider"></span>
							</div>
						</label>
					</div>
				)}
				<CustomSections type="Toolbar" />
				<button
					className={cx("toolbar-button find", {
						active: props.findPopupOpen,
					})}
					title={l10n.getString("reader-find-in-document")}
					tabIndex={-1}
					onClick={handleFindClick}
				>
					<IconFind />
				</button>
				{/* {platform === "zotero" && props.showContextPaneToggle && (
					<Fragment>
						<button
							className="toolbar-button context-pane-toggle"
							title={l10n.getString("reader-toggle-context-pane")}
							tabIndex={-1}
							onClick={props.onToggleContextPane}
						>
							{props.stackedView ? (
								<IconSidebarBottom />
							) : (
								<IconSidebar className="standard-view" />
							)}
						</button>
					</Fragment>
				)} */}
			</div>
		</div>
	);
}

export default Toolbar;
