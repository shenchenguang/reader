import { Localized, useLocalization } from "@fluent/react";
import cx from "classnames";
import React, { useContext, useEffect, useRef, useState } from "react";
import { ReaderContext } from "../reader";
import CustomSections from "./common/custom-sections";
import { IconColor20 } from "./common/icons";

import IconCheck12 from "../../../res/icons/12/check.svg";
import IconCheck20 from "../../../res/icons/20/check.svg";
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

const TRANSLATION_SERVICE_META = {
	aegean: {
		label: "学术翻译",
		description: "适用于期刊论文与研究报告翻译，术语翻译规范严谨。",
	},
	zhipu: {
		label: "流畅翻译",
		description: "适用于学位论文与综述翻译，学科通用性强。",
	},
	siliconflow: {
		label: "通用翻译",
		description: "适用于全学科通用学术文本翻译。",
	},
};

const TRANSLATION_GLOSSARY_ENABLED_KEY =
	"reader-translation-glossary-enabled";
const TRANSLATION_GLOSSARY_ID_KEY = "reader-translation-glossary-id";

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
						handleIframeClick,
					);
					cleanupFns.push(() => {
						iframeDoc.removeEventListener(
							"pointerdown",
							handleIframeClick,
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
	const translationLanguages = Array.isArray(props.languageList)
		? props.languageList
		: [];
	const sourceLanguages = translationLanguages;
	const targetLanguages = translationLanguages.filter(
		(language) => language.key !== "auto",
	);
	const glossaryList = Array.isArray(props.glossaryList)
		? props.glossaryList
		: [];
	const { l10n } = useLocalization();
	const hasTranslation =
		props.showTranslationControls && translationServices.length > 0;
	const downloadOptions = [
		{
			id: "original",
			label: l10n.getString("reader-download-original"),
		},
		props.hasTranslationResult && {
			id: "translation",
			label: l10n.getString("reader-download-translation"),
		},
		props.hasAnnotations && {
			id: "original-with-annotations",
			label: l10n.getString("reader-download-original-with-annotations"),
		},
	].filter(Boolean);
	const downloadHasDropdown = downloadOptions.length > 1;
	function getBestDefaultService() {
		try {
			const savedServiceId = localStorage.getItem(
				"reader-translation-service-id",
			);
			if (
				savedServiceId &&
				translationServices.some(
					(service) => service.key === savedServiceId,
				)
			) {
				return savedServiceId;
			}
		} catch (e) {}
		if (
			props.defaultTranslateKey &&
			translationServices.some(
				(service) => service.key === props.defaultTranslateKey,
			)
		) {
			return props.defaultTranslateKey;
		}
		return translationServices[0]?.key || null;
	}

	const [translationParams, setTranslationParams] = useState(() => ({
		lang_in: "auto",
		lang_out: "zh",
		engine: getBestDefaultService() || "",
		pages: "",
		glossaries: "",
	}));
	const [isGlossaryEnabled, setIsGlossaryEnabled] = useState(() => {
		try {
			return (
				localStorage.getItem(TRANSLATION_GLOSSARY_ENABLED_KEY) ===
				"true"
			);
		} catch (e) {}
		return false;
	});
	const [selectedGlossaryId, setSelectedGlossaryId] = useState(() => {
		try {
			return (
				localStorage.getItem(TRANSLATION_GLOSSARY_ID_KEY) ||
				props.selectedGlossaryId ||
				""
			);
		} catch (e) {}
		return props.selectedGlossaryId || "";
	});
	const [pageMode, setPageMode] = useState("all");
	const [customPages, setCustomPages] = useState("");
	const [activeTranslationSubmenu, setActiveTranslationSubmenu] =
		useState(null);
	const [activeTranslationSubmenuTop, setActiveTranslationSubmenuTop] =
		useState(36);
	const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
	const { platform } = useContext(ReaderContext);
	const isCustomPagesRequired = props.pagesCount > 100;
	const isStartTranslationDisabled =
		!translationParams.engine ||
		props.translationLoading ||
		(isCustomPagesRequired && !customPages.trim());

	useDropdownAutoClose(sidebarDropdownRef, isSidebarDropdownOpen, () =>
		setIsSidebarDropdownOpen(false),
	);
	useDropdownAutoClose(toolDropdownRef, isToolPaletteOpen, () =>
		setIsToolPaletteOpen(false),
	);
	useDropdownAutoClose(translationDropdownRef, isTranslationMenuOpen, () =>
		setIsTranslationMenuOpen(false),
	);
	useDropdownAutoClose(downloadDropdownRef, isDownloadMenuOpen, () =>
		setIsDownloadMenuOpen(false),
	);

	useEffect(() => {
		if (!hasTranslation) {
			setTranslationParams((prev) => ({ ...prev, engine: "" }));
			setIsTranslationMenuOpen(false);
			return;
		}
		setTranslationParams((prev) => {
			if (translationServices.some((service) => service.key === prev.engine)) {
				return prev;
			}
			return { ...prev, engine: getBestDefaultService() || "" };
		});
	}, [hasTranslation, props.translateList]);

	useEffect(() => {
		if (!isGlossaryEnabled) {
			updateTranslationParam("glossaries", "");
			return;
		}

		const isCurrentValid = glossaryList.some(
			(item) => item.id === selectedGlossaryId,
		);
		const isPropValid = glossaryList.some(
			(item) => item.id === props.selectedGlossaryId,
		);
		const nextGlossaryId = isCurrentValid
			? selectedGlossaryId
			: isPropValid
				? props.selectedGlossaryId
				: glossaryList[0]?.id || "";

		if (nextGlossaryId) {
			if (nextGlossaryId !== selectedGlossaryId) {
				setGlossarySelection(nextGlossaryId, false);
			} else {
				updateTranslationParam("glossaries", nextGlossaryId);
			}
		} else {
			setSelectedGlossaryId("");
			updateTranslationParam("glossaries", "");
		}
	}, [
		isGlossaryEnabled,
		props.glossaryList,
		props.selectedGlossaryId,
		selectedGlossaryId,
	]);

	useEffect(() => {
		if (isCustomPagesRequired) {
			setPageMode("custom");
		}
	}, [isCustomPagesRequired]);

	function getTranslationServiceLabel(service) {
		if (!service) {
			return "";
		}
		return TRANSLATION_SERVICE_META[service.key]?.label || service.value || service.key;
	}

	function getTranslationServiceDescription(service) {
		if (!service) {
			return "";
		}
		return TRANSLATION_SERVICE_META[service.key]?.description || "";
	}

	function getLanguageLabel(languageKey) {
		return (
			translationLanguages.find((language) => language.key === languageKey)
				?.value ||
			languageKey ||
			""
		);
	}

	function getSelectedTranslationService() {
		return translationParams.engine
			? translationServices.find(
					(service) => service.key === translationParams.engine,
				) || { key: translationParams.engine }
			: null;
	}

	function getSelectedGlossary() {
		return glossaryList.find((item) => item.id === selectedGlossaryId);
	}

	function getPagesValue() {
		if (isCustomPagesRequired || pageMode === "custom") {
			return customPages.trim();
		}
		return "";
	}

	function getPageRangeLabel() {
		const pages = getPagesValue();
		if (pages) {
			return pages;
		}
		return pageMode === "custom" ? "自定义" : "全部";
	}

	function updateTranslationParam(key, value) {
		setTranslationParams((prev) => ({ ...prev, [key]: value }));
	}

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
			props.onStopTranslation?.(getSelectedTranslationService());
			setIsTranslationMenuOpen(false);
			return;
		}
		handleStartTranslation();
	}

	function handleTranslationMenuToggle() {
		setIsTranslationMenuOpen((prev) => {
			const next = !prev;
			if (!next) {
				setActiveTranslationSubmenu(null);
			}
			return next;
		});
	}

	function handleStartTranslation() {
		if (
			!hasTranslation ||
			!translationParams.engine ||
			props.translationLoading ||
			(isCustomPagesRequired && !customPages.trim())
		) {
			return;
		}
		let selectedItem = getSelectedTranslationService();
		if (!selectedItem) {
			return;
		}
		const pages = getPagesValue();
		const glossaries =
			isGlossaryEnabled && selectedGlossaryId ? selectedGlossaryId : "";
		setIsTranslationMenuOpen(false);
		setActiveTranslationSubmenu(null);
		props.onStartTranslation?.(selectedItem, {
			pagesCount: props.pagesCount,
			lang_in: translationParams.lang_in,
			lang_out: translationParams.lang_out,
			engine: selectedItem.key,
			pages,
			glossaries,
		});
	}

	function handleSelectTranslationService(serviceKey) {
		updateTranslationParam("engine", serviceKey);
		try {
			localStorage.setItem("reader-translation-service-id", serviceKey);
		} catch (e) {
			// Ignore localStorage errors
		}
	}

	function openTranslationSubmenu(submenu, event) {
		setActiveTranslationSubmenu(submenu);
		if (event?.currentTarget) {
			setActiveTranslationSubmenuTop(event.currentTarget.offsetTop);
		}
	}

	function setGlossarySelection(glossaryId, notifyHost = true) {
		setSelectedGlossaryId(glossaryId);
		updateTranslationParam(
			"glossaries",
			isGlossaryEnabled && glossaryId ? glossaryId : "",
		);
		try {
			if (glossaryId) {
				localStorage.setItem(TRANSLATION_GLOSSARY_ID_KEY, glossaryId);
			} else {
				localStorage.removeItem(TRANSLATION_GLOSSARY_ID_KEY);
			}
		} catch (e) {}
		if (notifyHost && glossaryId) {
			props.onSelectGlossary?.(glossaryId);
		}
	}

	function handleGlossaryToggle(event) {
		const enabled = event.target.checked;
		setIsGlossaryEnabled(enabled);
		try {
			localStorage.setItem(
				TRANSLATION_GLOSSARY_ENABLED_KEY,
				String(enabled),
			);
		} catch (e) {}
		if (!enabled) {
			updateTranslationParam("glossaries", "");
			setActiveTranslationSubmenu((submenu) =>
				submenu === "glossary" ? null : submenu,
			);
			return;
		}

		const validSelectedId = glossaryList.some(
			(item) => item.id === selectedGlossaryId,
		)
			? selectedGlossaryId
			: "";
		const nextGlossaryId = validSelectedId || glossaryList[0]?.id || "";
		if (nextGlossaryId) {
			setGlossarySelection(nextGlossaryId);
			updateTranslationParam("glossaries", nextGlossaryId);
			return;
		}
		props.onCreateGlossary?.();
	}

	function handleGlossaryRowOpen(event) {
		if (!isGlossaryEnabled) {
			return;
		}
		if (!glossaryList.length) {
			props.onCreateGlossary?.();
			return;
		}
		openTranslationSubmenu("glossary", event);
	}

	function handleDownloadMenuToggle() {
		if (!downloadHasDropdown) {
			handleDownload(downloadOptions[0].id);
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
		} else if (option === "original-with-annotations") {
			props.onDownloadOriginalWithAnnotations?.();
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
		(option) => !(option.pdfOnly && props.type !== "pdf"),
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
		const selectedService = getSelectedTranslationService();
		const selectedGlossary = getSelectedGlossary();

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
								},
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
								onMouseLeave={() =>
									setActiveTranslationSubmenu(null)
								}
							>
								{!translationEngaged && (
									<>
										<div className="translation-menu-section">
											<div className="translation-dropdown-label">
												源语言
											</div>
											<button
												type="button"
												className="translation-menu-row"
													onClick={(event) =>
														openTranslationSubmenu(
															"lang_in",
															event,
														)
													}
													onMouseEnter={(event) =>
														openTranslationSubmenu(
															"lang_in",
															event,
														)
													}
											>
												<span>
													{getLanguageLabel(
														translationParams.lang_in,
													)}
												</span>
												<IconChevronDown8 className="translation-menu-row-icon" />
											</button>
										</div>

										<div className="translation-menu-section">
											<div className="translation-dropdown-label">
												翻译成
											</div>
											<button
												type="button"
												className="translation-menu-row"
													onClick={(event) =>
														openTranslationSubmenu(
															"lang_out",
															event,
														)
													}
													onMouseEnter={(event) =>
														openTranslationSubmenu(
															"lang_out",
															event,
														)
													}
											>
												<span>
													{getLanguageLabel(
														translationParams.lang_out,
													)}
												</span>
												<IconChevronDown8 className="translation-menu-row-icon" />
											</button>
										</div>

										<div className="translation-menu-divider" />

										<button
											type="button"
											className="translation-menu-row plain"
											onClick={(event) =>
												openTranslationSubmenu(
													"pages",
													event,
												)
											}
											onMouseEnter={(event) =>
												openTranslationSubmenu(
													"pages",
													event,
												)
											}
										>
											<span className="translation-menu-row-label">
												页码范围
											</span>
											<span className="translation-menu-row-value">
												{getPageRangeLabel()}
											</span>
											<IconChevronDown8 className="translation-menu-row-icon" />
										</button>

										<div className="translation-menu-divider" />

										<button
											type="button"
											className="translation-menu-row plain"
											onClick={(event) =>
												openTranslationSubmenu(
													"engine",
													event,
												)
											}
											onMouseEnter={(event) =>
												openTranslationSubmenu(
													"engine",
													event,
												)
											}
										>
											<span className="translation-menu-row-label">
												翻译服务
											</span>
											<span className="translation-menu-row-value">
												{getTranslationServiceLabel(
													selectedService,
												)}
											</span>
											<IconChevronDown8 className="translation-menu-row-icon" />
										</button>
										<div className="translation-menu-help">
											如果需要翻译论文和专业文档，可以选择学术翻译，提供更准确的解析。
										</div>

											<div className="translation-glossary-header">
												<div className="translation-glossary-title">
													术语库
												</div>
												<label className="translation-switch">
													<input
														type="checkbox"
														checked={isGlossaryEnabled}
														onChange={handleGlossaryToggle}
													/>
													<span />
												</label>
											</div>
											{isGlossaryEnabled && (
												<button
													type="button"
													className="translation-menu-row translation-glossary-select-row"
													onClick={handleGlossaryRowOpen}
														onMouseEnter={(event) => {
															if (glossaryList.length) {
																openTranslationSubmenu(
																	"glossary",
																	event,
																);
															}
														}}
												>
													<span>
														{selectedGlossary?.name ||
															"新建术语库"}
													</span>
													<IconChevronDown8 className="translation-menu-row-icon" />
												</button>
											)}
											<div className="translation-menu-help">
												定义词组或短语翻译规则，翻译时将融合进译文结果。
											</div>
										</>
									)}

								{!translationEngaged && (
									<button
										type="button"
										className="translation-start-button"
										onClick={handleStartTranslation}
										disabled={isStartTranslationDisabled}
									>
										{l10n.getString(
											"reader-translation-start",
										)}
									</button>
								)}

								{!translationEngaged &&
									activeTranslationSubmenu && (
											<div
												className={cx(
													"translation-submenu",
													activeTranslationSubmenu,
												)}
												style={{
													top: activeTranslationSubmenuTop,
												}}
												onMouseLeave={() =>
													setActiveTranslationSubmenu(
														null,
													)
												}
											>
											{activeTranslationSubmenu ===
												"lang_in" && (
												<div className="translation-submenu-list">
													{sourceLanguages.map(
														(language) => (
															<button
																type="button"
																key={
																	language.key
																}
																className={cx(
																	"translation-submenu-option",
																	{
																		active:
																			translationParams.lang_in ===
																			language.key,
																	},
																)}
																onClick={() =>
																	updateTranslationParam(
																		"lang_in",
																		language.key,
																	)
																}
															>
																<span>
																	{
																		language.value
																	}
																</span>
																{translationParams.lang_in ===
																	language.key && (
																	<IconCheck12 className="translation-option-icon" />
																)}
															</button>
														),
													)}
												</div>
											)}

											{activeTranslationSubmenu ===
												"lang_out" && (
												<div className="translation-submenu-list">
													{targetLanguages.map(
														(language) => (
															<button
																type="button"
																key={
																	language.key
																}
																className={cx(
																	"translation-submenu-option",
																	{
																		active:
																			translationParams.lang_out ===
																			language.key,
																	},
																)}
																onClick={() =>
																	updateTranslationParam(
																		"lang_out",
																		language.key,
																	)
																}
															>
																<span>
																	{
																		language.value
																	}
																</span>
																{translationParams.lang_out ===
																	language.key && (
																	<IconCheck12 className="translation-option-icon" />
																)}
															</button>
														),
													)}
												</div>
											)}

											{activeTranslationSubmenu ===
												"pages" && (
												<div className="translation-pages-panel">
													<button
														type="button"
														className={cx(
															"translation-submenu-option",
															{
																active:
																	pageMode ===
																	"all",
															},
														)}
														onClick={() =>
															setPageMode("all")
														}
														disabled={
															isCustomPagesRequired
														}
													>
														<span>全部</span>
															{pageMode ===
																"all" && (
																<IconCheck20 className="translation-page-check-icon" />
															)}
													</button>
													<button
														type="button"
														className={cx(
															"translation-submenu-option",
															{
																active:
																	pageMode ===
																	"custom",
															},
														)}
														onClick={() =>
															setPageMode("custom")
														}
													>
														<span>自定义</span>
															{pageMode ===
																"custom" && (
																<IconCheck20 className="translation-page-check-icon" />
															)}
													</button>
													{pageMode === "custom" && (
														<input
															type="text"
															inputMode="text"
															className="translation-custom-pages-input"
															placeholder="例如：1,2,1-,-3,3-5"
															value={customPages}
															onChange={(event) => {
																setCustomPages(
																	event.target.value,
																);
															}}
															autoFocus
														/>
													)}
													<div className="translation-pages-note">
														说明：
														<br />
														{isCustomPagesRequired
															? "超过 100 页时必须填写页码范围；支持单页、闭合范围和开放式范围"
															: "支持单页、闭合范围和开放式范围；留空表示全部页面"}
													</div>
												</div>
											)}

												{activeTranslationSubmenu ===
													"engine" && (
													<div className="translation-service-panel">
														{translationServices.map(
															(service) => (
															<button
																type="button"
																key={
																	service.key
																}
																className={cx(
																	"translation-service-option",
																	{
																		active:
																			translationParams.engine ===
																			service.key,
																	},
																)}
																onClick={() =>
																	handleSelectTranslationService(
																		service.key,
																	)
																}
															>
																<div>
																	<div className="translation-service-title">
																		{getTranslationServiceLabel(
																			service,
																		)}
																	</div>
																	<div className="translation-service-description">
																		{getTranslationServiceDescription(
																			service,
																		)}
																	</div>
																</div>
																{translationParams.engine ===
																	service.key && (
																	<IconCheck12 className="translation-option-icon" />
																)}
															</button>
														),
														)}
													</div>
												)}

												{activeTranslationSubmenu ===
													"glossary" && (
													<div className="translation-submenu-list translation-glossary-list">
														{glossaryList.map((item) => (
															<button
																type="button"
																key={item.id}
																className={cx(
																	"translation-submenu-option",
																	{
																		active:
																			selectedGlossaryId ===
																			item.id,
																	},
																)}
																onClick={() =>
																	setGlossarySelection(
																		item.id,
																	)
																}
															>
																<span>{item.name}</span>
																{selectedGlossaryId ===
																	item.id && (
																	<IconCheck12 className="translation-option-icon" />
																)}
															</button>
														))}
														<div className="translation-menu-divider" />
														<button
															type="button"
															className="translation-glossary-add-option"
															onClick={() =>
																props.onCreateGlossary?.()
															}
														>
															<span className="translation-glossary-add-icon">
																+
															</span>
															<span>添加术语库</span>
														</button>
													</div>
												)}
											</div>
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
													},
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
												props.tool.type,
											)
										}
										title={l10n.getString(
											"reader-pick-color",
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
														props.tool.type,
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
							{downloadOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									onClick={() => handleDownload(option.id)}
								>
									{option.label}
								</button>
							))}
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
